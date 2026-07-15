import 'server-only';

import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * 페이지용 가드. 로그인하지 않았으면 /signin 으로 보낸다.
 *
 * middleware.ts 를 쓰지 않는 이유: 미들웨어에서 lib/auth.ts 를 import 하면
 * pg / bcryptjs 가 딸려와 Edge 번들에서 터진다. 어차피 모든 액션은 소유권 검사를 위해
 * 세션이 필요하므로 이 헬퍼 하나로 통일하면 Edge 호환성 문제 자체가 사라진다.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  return session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}

/**
 * Server Action 용 가드. 리다이렉트 대신 null 을 반환해서
 * 액션이 UNAUTHORIZED 를 판별 유니온으로 돌려줄 수 있게 한다.
 */
export async function getUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}
