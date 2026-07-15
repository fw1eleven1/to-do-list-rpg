import type { AdapterAccountType } from 'next-auth/adapters';
import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// @auth/drizzle-adapter 표준 스키마.
// 어댑터는 여기 정의된 "속성명"(emailVerified, sessionToken, providerAccountId ...)에 의존하므로
// 이름을 바꾸면 어댑터가 깨진다. DB 컬럼명은 drizzle 의 casing:'snake_case' 가 알아서 변환한다.
// 이 파일은 어댑터 소유 영역이다 — 게임 관련 컬럼을 여기 얹지 말 것 (game.ts 의 characters 로).

export const users = pgTable('users', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text(),
  email: text().unique(),
  emailVerified: timestamp({ mode: 'date', withTimezone: true }),
  image: text(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().$type<AdapterAccountType>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

// 세션 전략이 JWT 라 이 테이블은 실제로 사용되지 않는다 (docs/architecture.md 참고).
// Credentials provider 가 database session 과 양립 불가하기 때문. 어댑터 표준 스키마라 그대로 둔다.
export const sessions = pgTable('sessions', {
  sessionToken: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
});

// MVP 에서는 미사용 (이메일 인증 범위 밖). 2차에서 이메일 인증 붙일 때 사용.
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// 이메일+비밀번호 로그인용. users 에 password 컬럼을 얹지 않는 이유:
//  - users 는 어댑터 소유라 버전업 시 충돌 지점이 된다
//  - Google 로만 가입한 유저에게 영원히 NULL 인 컬럼이 생긴다
//  - 행의 존재 자체가 "이 유저는 비밀번호 로그인이 가능하다"를 뜻해 상태가 명확해진다
export const userCredentials = pgTable('user_credentials', {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
