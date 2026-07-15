import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './auth';
import { todos } from './todo';

// users 확장이 아니라 별도 테이블인 이유: users 는 어댑터 소유이고,
// 2차 기능(칭호 슬롯, 배치 layout, 골드)이 전부 여기로 들어올 예정이라
// users 를 확장하면 인증 테이블이 게임 테이블로 변질된다.
export const characters = pgTable(
  'characters',
  {
    id: uuid().primaryKey().defaultRandom(),
    // UNIQUE 가 users 와의 1:1 을 강제한다
    userId: text()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    // level 컬럼은 일부러 두지 않는다. 레벨은 total_xp 의 순수 함수(lib/game/level.ts)라
    // 저장하면 드리프트할 수 있는 중복이 된다. 곡선을 리밸런싱하면 전 유저 레벨이 자동 재계산된다.
    totalXp: integer().notNull().default(0),
    // 연체일수 계산 기준. UTC 로 계산하면 LA 유저가 마감일 저녁에 완료했을 때
    // 없는 연체 1일이 생겨 10% 를 강탈당한다.
    timezone: text().notNull().default('Asia/Seoul'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),

    // 2차 확장 지점:
    //   equippedTitleId uuid → titles.id
    //   layout jsonb   { "itemId": { "x": 120, "y": 40 } }  메인 페이지 드래그앤드롭 배치
    //   gold integer NOT NULL DEFAULT 0
  },
  (t) => [check('characters_total_xp_non_negative', sql`${t.totalXp} >= 0`)],
);

// 2차: 'achievement' | 'item_sell' | 'bonus' 를 여기 추가하면 된다.
// 원장 구조 덕에 컬럼 추가가 아니라 enum 값 추가로 끝난다.
export const xpReason = pgEnum('xp_reason', ['quest_complete']);

// todos.awarded_xp 컬럼이 아니라 원장 테이블인 이유:
//  1. characters.total_xp 가 재구축 가능한 캐시가 된다 — sum(amount) 로 검증/복구 가능
//  2. 2차 기능이 reason 값 추가만으로 끝난다
//  3. base_xp/overdue_days 스냅샷이 있어 UI 가 "기본 80 XP · 3일 연체 −30% → 56 XP" 를 그릴 수 있고,
//     공식이 바뀌어도 과거 기록이 거짓말하지 않는다
export const xpEvents = pgTable(
  'xp_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    todoId: uuid().references(() => todos.id, { onDelete: 'cascade' }),
    reason: xpReason().notNull(),
    // 부호 있음 = 향후 보정 행(완료 되돌리기 등)을 음수로 추가할 수 있다
    amount: integer().notNull(),
    baseXp: integer().notNull(),
    overdueDays: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('xp_events_user_created_idx').on(t.userId, t.createdAt.desc()),
    // 부분 유니크: 한 todo 당 quest_complete 는 단 한 번. 이중 지급을 DB 층에서 불가능하게 만든다.
    uniqueIndex('xp_events_one_completion_per_todo')
      .on(t.todoId)
      .where(sql`${t.reason} = 'quest_complete'`),
  ],
);

export const charactersRelations = relations(characters, ({ one }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
}));

// 2차 확장 지점 (테이블은 아직 만들지 않음):
//   item_definitions (id, name, description, rarity, icon, drop_weight)
//   item_rarity enum: 'common'|'uncommon'|'rare'|'epic'|'legendary'
//   inventory_items  (id, user_id, item_def_id, acquired_at, source_todo_id)
//     → 드랍 판정: quests.difficulty × item_rarity 확률 테이블
//   achievements     (id, code UNIQUE, name, description, title_reward)
//   user_achievements(user_id, achievement_id, unlocked_at) PK(user_id, achievement_id)
// 확장 훅은 전부 lib/services/todo-service.ts 의 완료 트랜잭션 한 곳으로 수렴한다.
