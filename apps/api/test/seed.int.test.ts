import { count } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/client.js';
import { seed } from '../src/db/seed.js';
import { items, wordExamples, words } from '../src/db/schema.js';
import { PROTOTYPE_WORDS } from '../src/db/prototype-words.js';
import { TEST_DATABASE_URL, hasTestDb } from './helpers/app.js';

describe.skipIf(!hasTestDb)('seed', () => {
  const { db, pool } = createDb(TEST_DATABASE_URL ?? 'postgres://invalid');
  afterAll(() => pool.end());

  it('is idempotent', async () => {
    await seed(db);
    const read = async () => [
      (await db.select({ n: count() }).from(words))[0]!.n,
      (await db.select({ n: count() }).from(wordExamples))[0]!.n,
      (await db.select({ n: count() }).from(items))[0]!.n,
    ];
    const first = await read();
    await seed(db);
    expect(await read()).toEqual(first);
    expect(first[0]).toBeGreaterThanOrEqual(PROTOTYPE_WORDS.length);
    expect(first[2]).toBe(8);
  });
});
