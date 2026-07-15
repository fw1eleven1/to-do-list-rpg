import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { quests, todos, xpEvents } from '@/db/schema';

export type QuestListItem = Awaited<ReturnType<typeof listQuests>>[number];

/**
 * 유저의 퀘스트 전체. 서버 컴포넌트가 직접 부른다.
 *
 * xp_events 를 조인해 완료 카드가 "기본 80 XP · 3일 연체 −30% → 56 XP 획득" 을 그릴 수 있게 한다.
 * 이 값들은 지급 시점의 스냅샷이라 나중에 공식이 바뀌어도 과거 기록이 거짓말하지 않는다.
 */
export async function listQuests(userId: string) {
  return db
    .select({
      todoId: todos.id,
      todoTitle: todos.title,
      dueDate: todos.dueDate,
      status: todos.status,
      completedAt: todos.completedAt,
      createdAt: todos.createdAt,

      questTitle: quests.title,
      questDescription: quests.description,
      questGiver: quests.questGiver,
      difficulty: quests.difficulty,
      baseXp: quests.baseXp,
      source: quests.source,

      awardedXp: xpEvents.amount,
      overdueDays: xpEvents.overdueDays,
    })
    .from(todos)
    .leftJoin(quests, eq(quests.todoId, todos.id))
    .leftJoin(xpEvents, eq(xpEvents.todoId, todos.id))
    .where(eq(todos.userId, userId))
    .orderBy(desc(todos.createdAt));
}
