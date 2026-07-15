import 'server-only';

import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';

import { db } from '@/db';
import {
  accounts,
  sessions,
  userCredentials,
  users,
  verificationTokens,
} from '@/db/schema';
import { env } from '@/lib/env';
import { getOrCreateCharacter } from '@/lib/services/character-service';
import { DUMMY_HASH, verifyPassword } from '@/lib/password';

const credentialsInput = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: '이메일', type: 'email' },
      password: { label: '비밀번호', type: 'password' },
    },
    async authorize(raw) {
      const parsed = credentialsInput.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const row = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          passwordHash: userCredentials.passwordHash,
        })
        .from(users)
        .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
        .where(eq(users.email, email))
        .limit(1);

      const user = row[0];

      // 유저가 없거나(=Google 전용 계정 포함) 비밀번호가 틀리면 똑같이 null 을 준다.
      // 어느 쪽인지 알려주면 가입된 이메일 목록을 캐낼 수 있다.
      // 유저가 없을 때도 더미 해시로 비교를 한 번 돌려 응답 시간을 맞춘다 (password.ts 주석 참고).
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user?.passwordHash || !ok) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
];

// 자격증명이 없으면 Google 은 아예 등록하지 않는다 — 등록해두면 버튼을 눌렀을 때 500 이 난다.
if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // allowDangerousEmailAccountLinking 은 일부러 켜지 않는다.
      // 켜면 같은 이메일의 Google 계정이 기존 비밀번호 계정에 자동으로 붙는데,
      // 이는 OAuth 제공자가 이메일 소유를 검증했다고 가정하는 것이다. 대신 OAuthAccountNotLinked
      // 에러를 /signin 에서 안내 문구로 잡는다.
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  // JWT 는 선택이 아니라 제약이다: Credentials provider 는 database session 전략과 양립할 수 없다.
  // 그래서 sessions 테이블은 만들어두되 실제로는 놀게 된다.
  // 대가: 서버측 세션 무효화 불가(로그아웃 = 쿠키 삭제). 이 규모에서는 수용 가능.
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/signin' },
  callbacks: {
    // JWT 전략에서는 이 두 콜백이 없으면 session.user.id 가 undefined 다.
    // 모든 소유권 검사가 여기 의존하므로 절대 빠뜨리면 안 된다.
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Google 최초 로그인 / 어댑터가 유저를 만들 때 캐릭터를 함께 만든다.
    // (이메일 가입은 signUpAction 이 트랜잭션 안에서 직접 만든다.)
    async createUser({ user }) {
      if (user.id) await getOrCreateCharacter(user.id);
    },
  },
});
