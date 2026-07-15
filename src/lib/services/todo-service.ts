import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { characters, quests, todos, xpEvents } from '@/db/schema';
import type { GeneratedQuest } from '@/lib/ai/types';
import { levelFrom } from '@/lib/game/level';
import { calcAwardedXp } from '@/lib/game/xp';
import { getOrCreateCharacter } from './character-service';

/** 최근 1시간 내 생성 가능한 할 일 수. 할 일 등록 = 매번 유료 AI 호출이라 상한이 필요하다. */
const HOURLY_LIMIT = 30;

export class ServiceError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED',
    message: string,
  ) {
    super(message);
  }
}

/**
 * 최근 1시간 생성량 확인. Redis 없이 DB 카운트 한 방으로 끝낸다 —
 * 이 규모에서 레이트리밋 하나 때문에 인프라를 늘릴 이유가 없다.
 */
export async function assertWithinRateLimit(userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(todos)
    .where(and(eq(todos.userId, userId), gte(todos.createdAt, since)));

  if (count >= HOURLY_LIMIT) {
    throw new ServiceError(
      'RATE_LIMITED',
      '한 시간에 등록할 수 있는 의뢰 수를 초과했습니다. 잠시 후 다시 시도해주세요.',
    );
  }
}

/**
 * 할 일 + 퀘스트를 함께 만든다.
 *
 * AI 호출은 이 함수 밖에서 이미 끝나 있어야 한다 (generated 를 받는 이유).
 * 트랜잭션을 열어둔 채 10초짜리 AI 를 호출하면 pg 커넥션을 붙잡아 동시 사용자 몇 명에
 * 풀이 고갈된다. AI 를 먼저 부르는 순서 덕에 "퀘스트 없는 고아 todo" 도 구조적으로 불가능해진다.
 */
export async function createTodoWithQuest(input: {
  userId: string;
  title: string;
  dueDate: string | null;
  generated: GeneratedQuest;
}) {
  const { userId, title, dueDate, generated } = input;

  return db.transaction(async (tx) => {
    const [todo] = await tx
      .insert(todos)
      .values({ userId, title, dueDate })
      .returning();

    const [quest] = await tx
      .insert(quests)
      .values({
        todoId: todo.id,
        userId,
        title: generated.title,
        description: generated.description,
        questGiver: generated.questGiver,
        difficulty: generated.difficulty,
        baseXp: generated.baseXp,
        source: generated.source,
        model: generated.model,
        promptVersion: generated.promptVersion,
      })
      .returning();

    return { todo, quest };
  });
}

export type CompletionResult = {
  awardedXp: number;
  baseXp: number;
  overdueDays: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
};

/**
 * 퀘스트 완료 → 경험치 지급.
 *
 * 2차 확장(아이템 드랍, 업적 판정)은 전부 이 트랜잭션 끝에 훅으로 붙는다.
 */
export async function completeTodo(
  userId: string,
  todoId: string,
): Promise<CompletionResult> {
  const character = await getOrCreateCharacter(userId);

  return db.transaction(async (tx) => {
    // 비교-후-교체(CAS). status='active' 조건이 더블클릭/동시 요청을 막고,
    // user_id 조건이 IDOR(남의 퀘스트 완료)을 막는다 — 모든 쿼리에 소유자 조건을 붙이는 게 규칙이다.
    const [todo] = await tx
      .update(todos)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(todos.id, todoId),
          eq(todos.userId, userId),
          eq(todos.status, 'active'),
        ),
      )
      .returning();

    // 0행 = 없는 퀘스트거나, 남의 것이거나, 이미 완료/파기된 것.
    // 어느 쪽인지 알려주지 않는다 — 남의 todoId 존재 여부를 캐낼 수 있다.
    if (!todo) {
      throw new ServiceError('CONFLICT', '이미 처리되었거나 존재하지 않는 의뢰입니다.');
    }

    const [quest] = await tx
      .select({ baseXp: quests.baseXp })
      .from(quests)
      .where(eq(quests.todoId, todo.id))
      .limit(1);

    // 폴백 덕에 퀘스트 없는 todo 는 생길 수 없지만, 없다면 최소 보상으로 방어한다.
    const baseXp = quest?.baseXp ?? 1;

    // completedAt 은 서버 시각만 쓴다. 클라이언트가 보내면 마감일로 백데이트해 감쇠를 회피할 수 있다.
    const { amount, overdueDays } = calcAwardedXp({
      baseXp,
      dueDate: todo.dueDate,
      completedAt: todo.completedAt ?? new Date(),
      timezone: character.timezone,
    });

    // 부분 유니크 인덱스(todo당 quest_complete 1행)가 이중 지급을 DB 층에서 막는다.
    // CAS 와 이중 방어.
    await tx.insert(xpEvents).values({
      userId,
      todoId: todo.id,
      reason: 'quest_complete',
      amount,
      baseXp,
      overdueDays,
    });

    // 읽고-쓰기가 아니라 상대 갱신이라 lost update 가 없다.
    const [updated] = await tx
      .update(characters)
      .set({ totalXp: sql`${characters.totalXp} + ${amount}`, updatedAt: new Date() })
      .where(eq(characters.userId, userId))
      .returning({ totalXp: characters.totalXp });

    const before = levelFrom(updated.totalXp - amount);
    const after = levelFrom(updated.totalXp);

    return {
      awardedXp: amount,
      baseXp,
      overdueDays,
      totalXp: updated.totalXp,
      level: after,
      leveledUp: after > before,
    };
  });
}

/** 파기. 완전 삭제가 아니라 취소 상태로 남겨 화면에 취소선으로 잔존한다. */
export async function cancelTodo(userId: string, todoId: string) {
  const [todo] = await db
    .update(todos)
    .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(todos.id, todoId),
        eq(todos.userId, userId),
        eq(todos.status, 'active'),
      ),
    )
    .returning();

  if (!todo) {
    throw new ServiceError('CONFLICT', '이미 처리되었거나 존재하지 않는 의뢰입니다.');
  }
  return todo;
}
