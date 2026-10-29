import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

/** Накатывает миграции на DATABASE_URL_TEST один раз перед всем прогоном. */
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    console.warn('DATABASE_URL_TEST is not set: integration tests will be skipped');
    return;
  }
  const { db, pool } = createDb(url);
  await runMigrations(db);
  await pool.end();
}
