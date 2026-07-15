// 서비스 계층을 직접 때리는 검증. 실제 공격자는 UI 를 거치지 않으므로 여기가 진짜 관문이다.
// 'server-only' 를 통과하려면 --conditions=react-server 로 실행해야 한다.
// 환경변수는 --env-file=.env.local 로 주입한다 (ESM import 호이스팅 때문에 여기서 로드하면 늦다)

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema/auth';
import { characters, xpEvents } from '@/db/schema/game';
import { todos } from '@/db/schema/todo';
import { fallbackQuest } from '@/lib/ai/fallback';
import { ServiceError, completeTodo, createTodoWithQuest } from '@/lib/services/todo-service';

let failed = false;
const check = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '  OK  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failed = true;
};

const stamp = Date.now();
const aliceId = `sec-alice-${stamp}`;
const bobId = `sec-bob-${stamp}`;

await db.insert(users).values([
  { id: aliceId, email: `sec-alice-${stamp}@test.com` },
  { id: bobId, email: `sec-bob-${stamp}@test.com` },
]);
await db.insert(characters).values([{ userId: aliceId }, { userId: bobId }]);

const totalXpOf = async (userId: string) =>
  (await db.select({ x: characters.totalXp }).from(characters).where(eq(characters.userId, userId)))[0].x;

const eventCountOf = async (todoId: string) =>
  (
    await db
      .select({ c: sql<number>`count(*)::int` })
      .from(xpEvents)
      .where(eq(xpEvents.todoId, todoId))
  )[0].c;

try {
  console.log('\n=== 1. IDOR: 밥이 앨리스의 의뢰를 완료 시도 ===');
  const { todo: aliceTodo } = await createTodoWithQuest({
    userId: aliceId,
    title: '앨리스의 의뢰',
    dueDate: null,
    generated: fallbackQuest('앨리스의 의뢰'),
  });

  try {
    await completeTodo(bobId, aliceTodo.id);
    check('밥이 앨리스의 의뢰를 완료할 수 없다', false, '완료가 성공해버림!');
  } catch (e) {
    check('밥의 완료 시도가 거부됨', e instanceof ServiceError && e.code === 'CONFLICT', String(e));
  }
  check('밥의 XP 는 그대로 0', (await totalXpOf(bobId)) === 0);
  check('앨리스의 XP 도 그대로 0', (await totalXpOf(aliceId)) === 0);
  check('xp_events 에 아무것도 안 남음', (await eventCountOf(aliceTodo.id)) === 0);

  const [stillActive] = await db.select().from(todos).where(eq(todos.id, aliceTodo.id));
  check('앨리스의 의뢰는 여전히 active', stillActive.status === 'active', stillActive.status);

  console.log('\n=== 2. 이중 지급: 같은 의뢰를 동시에 완료 ===');
  const results = await Promise.allSettled([
    completeTodo(aliceId, aliceTodo.id),
    completeTodo(aliceId, aliceTodo.id),
    completeTodo(aliceId, aliceTodo.id),
  ]);
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  check('3번 동시 요청 중 정확히 1번만 성공', succeeded === 1, `성공 ${succeeded}회`);
  check('xp_events 는 1행뿐', (await eventCountOf(aliceTodo.id)) === 1);
  check('XP 는 50 (100/150 이 아님)', (await totalXpOf(aliceId)) === 50, `실제 ${await totalXpOf(aliceId)}`);

  console.log('\n=== 3. 이미 완료한 의뢰 재완료 ===');
  try {
    await completeTodo(aliceId, aliceTodo.id);
    check('재완료가 거부된다', false, '성공해버림!');
  } catch (e) {
    check('재완료 거부', e instanceof ServiceError && e.code === 'CONFLICT');
  }
  check('XP 여전히 50', (await totalXpOf(aliceId)) === 50);

  console.log('\n=== 4. 존재하지 않는 의뢰 ===');
  try {
    await completeTodo(aliceId, '00000000-0000-0000-0000-000000000000');
    check('없는 의뢰 거부', false, '성공해버림!');
  } catch (e) {
    check('없는 의뢰 거부 (남의 것과 같은 에러 = ID 존재 여부 노출 안 함)',
      e instanceof ServiceError && e.code === 'CONFLICT');
  }
} finally {
  await db.delete(users).where(and(eq(users.id, aliceId)));
  await db.delete(users).where(and(eq(users.id, bobId)));
  console.log(failed ? '\n=== 결과: 실패 ===' : '\n=== 결과: 전부 통과 ===');
  process.exit(failed ? 1 : 0);
}
