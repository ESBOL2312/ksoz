import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const tgId = (name: string) => bigint(name, { mode: 'number' });
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const levelEnum = pgEnum('level', ['A1', 'A2', 'B1', 'B2']);
export const wordStatusEnum = pgEnum('word_status', ['draft', 'reviewed', 'published']);
export const categoryEnum = pgEnum('item_category', ['kiim', 'uy', 'mal', 'aspap']);
export const phaseEnum = pgEnum('srs_phase', ['learning', 'review']);
export const sourceEnum = pgEnum('word_source', ['lesson', 'bazaar']);
export const verdictEnum = pgEnum('verdict', ['correct', 'almost', 'wrong']);
export const ledgerReasonEnum = pgEnum('ledger_reason', ['review', 'task', 'purchase', 'prize']);

// --- словарь ---
export const words = pgTable(
  'words',
  {
    id: serial('id').primaryKey(),
    kk: text('kk').notNull(),
    kkLatn: text('kk_latn'),
    ru: text('ru').notNull(),
    en: text('en'),
    level: levelEnum('level').notNull().default('A1'),
    imageUrl: text('image_url'),
    audioUrl: text('audio_url'),
    status: wordStatusEnum('status').notNull().default('draft'),
  },
  (t) => [unique('words_kk_unique').on(t.kk), index('words_level_status_idx').on(t.level, t.status)],
);

export const wordExamples = pgTable(
  'word_examples',
  {
    id: serial('id').primaryKey(),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    kk: text('kk').notNull(),
    ru: text('ru').notNull(),
    position: smallint('position').notNull().default(0),
  },
  (t) => [index('word_examples_word_idx').on(t.wordId, t.position)],
);

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameKk: text('name_kk').notNull(),
  nameRu: text('name_ru').notNull(),
});

export const wordTopics = pgTable(
  'word_topics',
  {
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.topicId] }), index('word_topics_topic_idx').on(t.topicId)],
);

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id),
    category: categoryEnum('category').notNull(),
    price: integer('price').notNull(),
    minLevel: levelEnum('min_level').notNull().default('A1'),
    slot: text('slot').notNull(),
  },
  (t) => [unique('items_word_unique').on(t.wordId)],
);

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  nameKk: text('name_kk').notNull().unique(),
  nameRu: text('name_ru').notNull(),
});

// --- пользователи ---
export interface NotifySettings {
  short: boolean;
  daily: boolean;
  streak: boolean;
  baige: boolean;
}

export const users = pgTable(
  'users',
  {
    id: tgId('id').primaryKey(), // = Telegram id
    firstName: text('first_name').notNull(),
    username: text('username'),
    languageCode: text('language_code'),
    level: levelEnum('level').notNull().default('A1'),
    cityId: integer('city_id').references(() => cities.id),
    timezone: text('timezone').notNull().default('Asia/Almaty'),
    altyn: integer('altyn').notNull().default(0), // кеш баланса; меняется только через applyAltyn
    combo: integer('combo').notNull().default(0),
    streakCurrent: integer('streak_current').notNull().default(0),
    streakBest: integer('streak_best').notNull().default(0),
    lastActiveDay: date('last_active_day', { mode: 'string' }),
    aulStage: integer('aul_stage').notNull().default(0),
    notify: jsonb('notify')
      .$type<NotifySettings>()
      .notNull()
      .default(sql`'{"short":true,"daily":true,"streak":true,"baige":true}'::jsonb`),
    referrerId: tgId('referrer_id'),
    botBlocked: boolean('bot_blocked').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('users_city_idx').on(t.cityId)],
);

export const userWords = pgTable(
  'user_words',
  {
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id),
    phase: phaseEnum('phase').notNull().default('learning'),
    step: smallint('step').notNull().default(0),
    ease: doublePrecision('ease').notNull().default(2.5),
    intervalDays: integer('interval_days').notNull().default(0),
    dueAt: ts('due_at').notNull(),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    source: sourceEnum('source').notNull().default('lesson'),
    introducedAt: ts('introduced_at').notNull().defaultNow(),
    lastReviewedAt: ts('last_reviewed_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.wordId] }), index('user_words_due_idx').on(t.userId, t.dueAt)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    clientId: uuid('client_id').notNull().unique(),
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id),
    input: text('input').notNull(),
    verdict: verdictEnum('verdict').notNull(),
    hints: smallint('hints').notNull().default(0),
    ms: integer('ms').notNull().default(0),
    stepBefore: smallint('step_before'),
    dueBefore: ts('due_before'),
    dueAfter: ts('due_after').notNull(),
    altyn: integer('altyn').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('reviews_user_created_idx').on(t.userId, t.createdAt)],
);

export const friendships = pgTable(
  'friendships',
  {
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: tgId('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.friendId] }), index('friendships_friend_idx').on(t.friendId)],
);

// --- экономика ---
export const altynLedger = pgTable(
  'altyn_ledger',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: ledgerReasonEnum('reason').notNull(),
    refId: text('ref_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('altyn_ledger_user_idx').on(t.userId, t.createdAt)],
);

export const userItems = pgTable(
  'user_items',
  {
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id),
    equipped: boolean('equipped').notNull().default(false),
    acquiredAt: ts('acquired_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

export const dailyTasks = pgTable(
  'daily_tasks',
  {
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    code: text('code').notNull(),
    progress: integer('progress').notNull().default(0),
    target: integer('target').notNull(),
    reward: integer('reward').notNull(),
    claimedAt: ts('claimed_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.code] })],
);

export const weeklyScores = pgTable(
  'weekly_scores',
  {
    week: text('week').notNull(), // 'YYYY-Www'
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cityId: integer('city_id').references(() => cities.id),
    score: integer('score').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.week, t.userId] }),
    index('weekly_scores_week_score_idx').on(t.week, t.score),
    index('weekly_scores_week_city_score_idx').on(t.week, t.cityId, t.score),
  ],
);

export const notificationLog = pgTable(
  'notification_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: tgId('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    sentAt: ts('sent_at').notNull().defaultNow(),
  },
  (t) => [index('notification_log_user_kind_idx').on(t.userId, t.kind, t.sentAt)],
);

export type UserRow = typeof users.$inferSelect;
export type WordRow = typeof words.$inferSelect;
export type UserWordRow = typeof userWords.$inferSelect;
