import { relations, sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './auth';

// 취소는 "숨김"이 아니라 화면에 취소선으로 남는 1급 상태다.
// boolean 조합(is_done + deleted_at)으로 표현하면 is_done=true AND deleted_at IS NOT NULL 같은
// 무의미한 상태가 표현 가능해진다. enum 은 그 조합을 애초에 봉쇄한다.
export const todoStatus = pgEnum('todo_status', [
  'active',
  'completed',
  'cancelled',
]);

export const todos = pgTable(
  'todos',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 사용자가 입력한 원문. 불변 — AI 가 지어낸 퀘스트와 달리 이건 사용자의 진실이다.
    title: text().notNull(),
    // date 타입: 마감일 입력이 날짜 선택이고 XP 감쇠가 일 단위라 시각은 없는 정밀도다.
    dueDate: date({ mode: 'string' }),
    status: todoStatus().notNull().default('active'),
    completedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('todos_user_status_idx').on(t.userId, t.status),
    index('todos_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
);

export const questDifficulty = pgEnum('quest_difficulty', [
  'trivial',
  'easy',
  'normal',
  'hard',
  'legendary',
]);

// 'fallback' = AI 호출이 실패해 결정적 생성기가 채운 퀘스트.
// 2차에서 fallback → ai 재생성 대상을 이 컬럼으로 정확히 찾을 수 있다.
export const questSource = pgEnum('quest_source', ['ai', 'fallback']);

export const quests = pgTable(
  'quests',
  {
    id: uuid().primaryKey().defaultRandom(),
    // UNIQUE = todos 와 1:1. 이걸 떼는 것만으로 재생성 이력 버저닝(1:N)으로 확장된다.
    todoId: uuid()
      .notNull()
      .unique()
      .references(() => todos.id, { onDelete: 'cascade' }),
    // 비정규화 — 조인 없이 유저의 퀘스트를 훑기 위해
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text().notNull(),
    questGiver: text(),
    difficulty: questDifficulty().notNull(),
    // 생성 시점 값을 동결한다. 난이도→XP 매핑을 나중에 리밸런싱해도
    // 이미 발급된 퀘스트의 약속된 보상은 바뀌면 안 된다.
    baseXp: integer().notNull(),
    source: questSource().notNull().default('ai'),
    model: text(),
    promptVersion: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('quests_base_xp_positive', sql`${t.baseXp} >= 1`)],
);

export const todosRelations = relations(todos, ({ one }) => ({
  quest: one(quests, { fields: [todos.id], references: [quests.todoId] }),
}));

export const questsRelations = relations(quests, ({ one }) => ({
  todo: one(todos, { fields: [quests.todoId], references: [todos.id] }),
}));
