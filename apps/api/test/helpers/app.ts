import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig, type Config } from '../../src/config.js';
import { createDb } from '../../src/db/client.js';
import { seed } from '../../src/db/seed.js';

export const TEST_DATABASE_URL = process.env.DATABASE_URL_TEST;
/** describe.skipIf(!hasTestDb) для интеграционных тестов */
export const hasTestDb = Boolean(TEST_DATABASE_URL);

export const BOT_TOKEN = '123456:test-bot-token';

export function testConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL ?? 'postgres://invalid',
    BOT_TOKEN,
    ADMIN_IDS: '9001',
    ...overrides,
  });
}

export async function makeTestApp(overrides: Partial<NodeJS.ProcessEnv> = {}): Promise<FastifyInstance> {
  const app = await buildApp(testConfig(overrides));
  await app.ready();
  return app;
}

const TABLES = [
  'notification_log', 'weekly_scores', 'daily_tasks', 'user_items', 'altyn_ledger',
  'reviews', 'user_words', 'friendships', 'users',
];

/** Очищает пользовательские таблицы (словарь, города и товары остаются). */
export async function resetDb(app: FastifyInstance): Promise<void> {
  await app.db.execute(sql.raw(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}

/** Заполняет словарь сидом (идемпотентно). */
export async function seedDb(): Promise<void> {
  const { db, pool } = createDb(TEST_DATABASE_URL!);
  await seed(db);
  await pool.end();
}
