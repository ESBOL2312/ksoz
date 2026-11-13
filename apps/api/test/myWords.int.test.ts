import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userWords } from '../src/db/schema.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client, wordId } from './helpers/api.js';

describe.skipIf(!hasTestDb)('GET /v1/my-words', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  it('lists words in progress with groups, answer counts and history; mastered only counted', async () => {
    const c = client(app, 31);
    const su = await wordId(app, 'Су');
    const nan = await wordId(app, 'Нан');
    const ake = await wordId(app, 'Әке');
    for (const id of [su, nan, ake]) await c.post('/v1/lesson/introduce', { word_id: id });

    const past = new Date(Date.now() - 60_000);
    // Су: пора повторить, одна ошибка и один верный ответ
    await app.db.update(userWords).set({ dueAt: past }).where(eq(userWords.wordId, su));
    expect((await c.review(su, 'қате')).statusCode).toBe(200);
    await app.db.update(userWords).set({ dueAt: past }).where(eq(userWords.wordId, su));
    expect((await c.review(su, 'су')).statusCode).toBe(200);
    await app.db.update(userWords).set({ dueAt: past }).where(eq(userWords.wordId, su));
    // Нан: долгие повторы, интервал 6 дней
    await app.db
      .update(userWords)
      .set({ phase: 'review', intervalDays: 6, dueAt: new Date(Date.now() + 6 * 86_400_000) })
      .where(eq(userWords.wordId, nan));
    // Әке: выучено
    await app.db
      .update(userWords)
      .set({ phase: 'review', intervalDays: 30, dueAt: new Date(Date.now() + 30 * 86_400_000) })
      .where(eq(userWords.wordId, ake));
    await c.post('/v1/lesson/known', { word_id: await wordId(app, 'Ана') });

    const res = await c.get('/v1/my-words');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mastered).toBe(2);
    expect(body.words.map((w: any) => [w.word_id, w.group])).toEqual([
      [su, 'due'],
      [nan, 'review'],
    ]);
    const s = body.words[0];
    expect(s.kk).toBe('Су');
    expect(s.answers).toEqual({ correct: 1, almost: 0, wrong: 1 });
    expect(s.recent).toEqual(['wrong', 'correct']);
    expect(s.phase).toBe('learning');
    expect(Array.isArray(s.examples)).toBe(true);
  });

  it('is empty for a new user', async () => {
    const res = await client(app, 32).get('/v1/my-words');
    expect(res.json()).toEqual({ words: [], mastered: 0 });
  });
});
