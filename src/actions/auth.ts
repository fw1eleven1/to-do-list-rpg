'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/db';
import { characters, userCredentials, users } from '@/db/schema';
import { getUser } from '@/lib/guard';
import { nicknameSchema } from '@/lib/nickname';
import { hashPassword } from '@/lib/password';
import { fail, ok, type ActionResult } from './types';

const signUpInput = z
  .object({
    nickname: nicknameSchema,
    email: z.email('이메일 형식이 올바르지 않습니다.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    passwordConfirm: z.string(),
  })
  // 클라이언트에서도 확인하지만 그건 편의일 뿐이다. 액션은 직접 호출될 수 있으므로 여기가 진짜 관문이다.
  .refine((v) => v.password === v.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

/**
 * Credentials provider 는 가입 기능을 제공하지 않으므로 직접 만든다.
 *
 * 이메일 인증은 MVP 범위 밖이라 users.emailVerified 는 NULL 로 둔다.
 * (2차에서 Resend + verificationTokens 테이블로 붙인다.)
 */
export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = signUpInput.safeParse(input);
  if (!parsed.success) {
    return fail('VALIDATION', parsed.error.issues[0].message);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const nickname = parsed.data.nickname;
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const userId = await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Google 로만 가입한 계정도 여기 걸린다. 의도된 동작 — 비밀번호를 나중에 붙이는 건
      // 계정 연결 흐름(2차)이지 가입이 아니다.
      if (existing.length > 0) {
        throw new SignUpConflict();
      }

      // 닉네임은 users.name 에 넣는다 — 어댑터 표준 컬럼이라 Google 로그인도 같은 자리에
      // 프로필 이름을 채워준다. 덕분에 화면은 가입 경로를 신경 쓰지 않아도 된다.
      const [user] = await tx
        .insert(users)
        .values({ email, name: nickname })
        .returning({ id: users.id });
      await tx.insert(userCredentials).values({ userId: user.id, passwordHash });
      await tx.insert(characters).values({ userId: user.id });

      return user.id;
    });

    return ok({ userId });
  } catch (e) {
    if (e instanceof SignUpConflict) {
      return fail('CONFLICT', '이미 가입된 이메일입니다.');
    }
    // users.email 의 UNIQUE 제약 — 위 조회와 INSERT 사이를 파고든 동시 가입.
    if (isUniqueViolation(e)) {
      return fail('CONFLICT', '이미 가입된 이메일입니다.');
    }
    console.error('signUpAction 실패', e);
    return fail('INTERNAL', '가입 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

const updateNicknameInput = z.object({ nickname: nicknameSchema });

/**
 * 닉네임 변경.
 *
 * JWT 안의 name 은 일부러 갱신하지 않는다. 화면은 getProfile() 로 DB 에서 읽으므로
 * 토큰이 낡아도 문제가 없고, 갱신하려면 요청마다 DB 를 치거나 세션을 다시 발급해야 한다.
 */
export async function updateNicknameAction(
  input: unknown,
): Promise<ActionResult<{ nickname: string }>> {
  const user = await getUser();
  if (!user?.id) return fail('UNAUTHORIZED', '로그인이 필요합니다.');

  const parsed = updateNicknameInput.safeParse(input);
  if (!parsed.success) return fail('VALIDATION', parsed.error.issues[0].message);

  const { nickname } = parsed.data;

  try {
    // user.id 조건이 남의 닉네임을 못 바꾸게 한다 — 모든 쿼리에 소유자 조건을 붙이는 게 규칙이다.
    const [updated] = await db
      .update(users)
      .set({ name: nickname })
      .where(eq(users.id, user.id))
      .returning({ name: users.name });

    if (!updated) return fail('NOT_FOUND', '계정을 찾을 수 없습니다.');

    revalidatePath('/quests');
    return ok({ nickname });
  } catch (e) {
    console.error('updateNicknameAction 실패', e);
    return fail('INTERNAL', '닉네임을 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

class SignUpConflict extends Error {}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && 'code' in e && e.code === '23505'
  );
}
