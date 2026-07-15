import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { characters, users } from '@/db/schema';

/**
 * 캐릭터 행을 보장한다.
 *
 * 캐릭터는 두 경로로 생기고(이메일 가입 트랜잭션 / Google 최초 로그인의 createUser 이벤트),
 * 그 이전에 만들어진 유저도 있을 수 있다. 어느 경로든 여기를 거치면 행이 존재함이 보장된다.
 * onConflictDoNothing 이라 동시 호출이나 중복 호출에도 안전하다.
 */
export async function getOrCreateCharacter(userId: string) {
  await db.insert(characters).values({ userId }).onConflictDoNothing();

  const [character] = await db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  return character;
}

/**
 * 화면에 그릴 프로필. 닉네임을 세션이 아니라 DB 에서 읽는 게 핵심이다.
 *
 * 세션 전략이 JWT 라 session.user.name 은 로그인 시점에 토큰으로 굳는다. 그래서 닉네임을
 * 수정해도 토큰의 옛 이름이 만료(30일)까지 남아 화면이 안 바뀐다.
 * 어차피 캐릭터를 읽느라 DB 를 치므로, 같은 쿼리에서 이름까지 가져오면 그 문제가 통째로 사라진다.
 * → session.user.name 은 표시에 쓰지 않는다.
 */
export async function getProfile(userId: string) {
  await db.insert(characters).values({ userId }).onConflictDoNothing();

  const [profile] = await db
    .select({
      nickname: users.name,
      totalXp: characters.totalXp,
      timezone: characters.timezone,
    })
    .from(characters)
    .innerJoin(users, eq(users.id, characters.userId))
    .where(eq(characters.userId, userId))
    .limit(1);

  return profile;
}
