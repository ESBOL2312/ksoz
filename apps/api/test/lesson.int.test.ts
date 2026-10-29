import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dailyTasks, userWords, words } from '../src/db/schema.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client, wordId } from './helpers/api.js';

describe.skipIf(!hasTestDb)('lesson', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  it('PATCH /v1/me validates and stores settings', async () => {
    const c = client(app, 10);
    const ok = await c.patch('/v1/me', { level: 'A2', timezone: 'Europe/Moscow', city_id: 1, notify: { short: false } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ level: 'A2', timezone: 'Europe/Moscow', city_id: 1 });
    expect(ok.json().notify).toEqual({ short: false, daily: true, streak: true, baige: true });
    expect((await c.patch('/v1/me', { timezone: 'Mars/Base' })).statusCode).toBe(400);
    expect((await c.patch('/v1/me', { city_id: 99999 })).statusCode).toBe(400);
  });

  it('queues due words first (ordered, kk hidden), then new words with kk', async () => {
    const c = client(app, 11);
    const a = await wordId(app, 'Су');
    const b = await wordId(app, 'Нан');
    await c.post('/v1/lesson/introduce', { word_id: a });
    await c.post('/v1/lesson/introduce', { word_id: b });
    const past = (min: number) => new Date(Date.now() - min * 60_000);
    await app.db.update(userWords).set({ dueAt: past(5) }).where(eq(userWords.wordId, a));
    await app.db.update(userWords).set({ dueAt: past(50) }).where(eq(userWords.wordId, b));

    const res = await c.get('/v1/lesson?limit=5');
    expect(res.statusCode).toBe(200);
    const cards = res.json().cards;
    expect(cards.slice(0, 2).map((x: any) => x.word_id)).toEqual([b, a]);
    for (const x of cards.slice(0, 2)) {
      expect(x.kind).toBe('review');
      expect(x.kk).toBeNull();
      expect(x.length).toBeGreaterThan(0);
    }
    const fresh = cards.slice(2);
    expect(fresh).toHaveLength(3);
    for (const x of fresh) {
      expect(x.kind).toBe('new');
      expect(typeof x.kk).toBe('string');
    }
    expect(cards.map((x: any) => x.word_id)).not.toContain(undefined);
    // новые только A1 для пользователя уровня A1
    const levels = await Promise.all(
      fresh.map(async (x: any) => (await app.db.select().from(words).where(eq(words.id, x.word_id)))[0]!.level),
    );
    expect(new Set(levels)).toEqual(new Set(['A1']));
  });

  it('not-yet-due words are not in the queue', async () => {
    const c = client(app, 12);
    const a = await wordId(app, 'Су');
    await c.post('/v1/lesson/introduce', { word_id: a });
    const cards = (await c.get('/v1/lesson?limit=50')).json().cards;
    expect(cards.find((x: any) => x.word_id === a)).toBeUndefined();
  });

  it('introduce is idempotent, limited per day and progresses the task', async () => {
    const c = client(app, 13);
    const a = await wordId(app, 'Су');
    const first = await c.post('/v1/lesson/introduce', { word_id: a });
    expect(first.statusCode).toBe(200);
    expect(first.json().next).toMatchObject({ phase: 'learning', step: 0 });
    const dueIn = new Date(first.json().next.due_at).getTime() - Date.now();
    expect(dueIn).toBeGreaterThan(19 * 60_000);
    expect(dueIn).toBeLessThanOrEqual(20 * 60_000);
    const again = await c.post('/v1/lesson/introduce', { word_id: a });
    expect(again.json()).toEqual(first.json());
    expect(await app.db.select().from(userWords)).toHaveLength(1);

    const home = (await c.get('/v1/home')).json();
    expect(home.tasks.find((t: any) => t.code === 'learn_5').progress).toBe(1);

    const fresh = (await c.get('/v1/lesson?limit=50')).json().cards;
    expect(fresh).toHaveLength(9); // 10 в день, одно уже показано
    for (const x of fresh) expect((await c.post('/v1/lesson/introduce', { word_id: x.word_id })).statusCode).toBe(200);
    const over = (await app.db.select({ id: words.id }).from(words).where(eq(words.status, 'published'))).find(
      (w) => w.id !== a && !fresh.some((x: any) => x.word_id === w.id),
    )!;
    const res = await c.post('/v1/lesson/introduce', { word_id: over.id });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('daily_limit_reached');
    expect((await c.get('/v1/lesson')).json().cards).toHaveLength(0);
    expect((await c.get('/v1/home')).json().new_left_today).toBe(0);
  });

  it('introduce rejects unknown and unpublished words', async () => {
    const c = client(app, 14);
    expect((await c.post('/v1/lesson/introduce', { word_id: 999999 })).statusCode).toBe(404);
    const a = await wordId(app, 'Су');
    await app.db.update(words).set({ status: 'draft' }).where(eq(words.id, a));
    try {
      expect((await c.post('/v1/lesson/introduce', { word_id: a })).statusCode).toBe(404);
    } finally {
      await app.db.update(words).set({ status: 'published' }).where(eq(words.id, a));
    }
  });

  it('hint reveals a growing prefix only for introduced words', async () => {
    const c = client(app, 15);
    const a = await wordId(app, 'Мектеп');
    expect((await c.post('/v1/lesson/hint', { word_id: a, hints_used: 0 })).statusCode).toBe(404);
    await c.post('/v1/lesson/introduce', { word_id: a });
    expect((await c.post('/v1/lesson/hint', { word_id: a, hints_used: 0 })).json()).toEqual({ hint: 'м', hints_used: 1 });
    expect((await c.post('/v1/lesson/hint', { word_id: a, hints_used: 2 })).json()).toEqual({ hint: 'мек', hints_used: 3 });
  });

  it('home creates three daily tasks once per day', async () => {
    const c = client(app, 16);
    const h1 = (await c.get('/v1/home')).json();
    expect(h1.tasks).toHaveLength(3);
    await c.get('/v1/home');
    expect(await app.db.select().from(dailyTasks).where(and(eq(dailyTasks.userId, 16)))).toHaveLength(3);
    expect(h1.new_left_today).toBe(10);
  });

  it('words and topics endpoints', async () => {
    const c = client(app, 17);
    const a = await wordId(app, 'Су');
    await c.post('/v1/lesson/introduce', { word_id: a });
    const list = (await c.get('/v1/words?topic=food')).json().words;
    const su = list.find((w: any) => w.id === a);
    expect(su.state).toMatchObject({ phase: 'learning', step: 0 });
    expect(list.find((w: any) => w.kk === 'Нан').state).toBeNull();
    expect(list.every((w: any) => w.kk)).toBe(true);
    expect((await c.get('/v1/words?level=B2')).json().words).toEqual([]);
    const t = (await c.get('/v1/topics')).json();
    expect(t.topics.find((x: any) => x.slug === 'food').words).toBe(6);
    expect(t.levels.map((l: any) => l.level)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });
});
