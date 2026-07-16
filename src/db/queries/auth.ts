import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { userCredentials } from '@/db/schema';

/**
 * 이 유저가 비밀번호 로그인이 가능한지.
 *
 * user_credentials 행의 존재 자체가 곧 "비밀번호가 있다"이다(schema/auth.ts 주석 참고).
 * Google 로만 가입한 계정은 행이 없으므로 false — 비밀번호 변경 UI 를 숨기는 데 쓴다.
 */
export async function hasPasswordCredential(userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: userCredentials.userId })
    .from(userCredentials)
    .where(eq(userCredentials.userId, userId))
    .limit(1);
  return rows.length > 0;
}
