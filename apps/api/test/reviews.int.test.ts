import { addDays, localDay } from '@ksoz/shared';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { altynLedger, reviews, userWords, users, weeklyScores } from '../src/db/schema.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client, setUser, wordId } from './helpers/api.js';

describe.skipIf(!hasTestDb)('POST /v1/reviews', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  async function learn(c: ReturnType<typeof client>, kk: string) {
    const id = await wordId(app, kk);
    expect((await c.post('/v1/lesson/introduce', { word_id: id })).statusCode).toBe(200);
    return id;
  }
  const uw = async (userId: number, wid: number) =>
    (await app.db.select().from(userWords).where(eq(userWords.wordId, wid))).find((r) => r.userId === userId)!;
  const user = async (id: number) => (await app.db.select().from(users).where(eq(users.id, id)))[0]!;

  it('correct answer: verdict, altyn, combo, SRS step', async () => {
    const c = client(app, 20);
    const id = await learn(c, 'Әке');
    const res = await c.review(id, ' Әке ');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      verdict: 'correct',
      answer: 'Әке',
      fix: [],
      altyn: { base: 10, combo: 0, earned: 10, balance: 10 },
      next: { phase: 'learning', step: 1 },
    });
    expect(body.examples).toBeInstanceOf(Array);
    const dueIn = new Date(body.next.due_at).getTime() - Date.now();
    expect(dueIn).toBeGreaterThan(59 * 60_000);
    expect(dueIn).toBeLessThanOrEqual(60 * 60_000);
    expect((await user(20)).combo).toBe(1);

    const second = (await c.review(id, 'әке')).json();
    expect(second.altyn).toMatchObject({ base: 10, combo: 1, earned: 11, balance: 21 });
    expect(second.next.step).toBe(2);
    expect((await user(20)).combo).toBe(2);
    expect(await app.db.select().from(altynLedger)).toHaveLength(2);
    const [ws] = await app.db.select().from(weeklyScores);
    expect(ws?.score).toBe(21);
  });

  it('almost: half reward, combo does not grow, fix positions, still moves forward', async () => {
    const c = client(app, 21);
    const id = await learn(c, 'Әке');
    await setUser(app, 21, { combo: 4 });
    const res = (await c.review(id, 'аке')).json();
    expect(res.verdict).toBe('almost');
    expect(res.fix).toEqual([{ pos: 0, expected: 'ә' }]);
    expect(res.altyn.base).toBe(5);
    expect(res.altyn.earned).toBe(7); // 5 * 1.4
    expect(res.next.step).toBe(1);
    expect((await user(21)).combo).toBe(4);
  });

  it('wrong: no altyn, combo reset, step back to 0', async () => {
    const c = client(app, 22);
    const id = await learn(c, 'Әке');
    await c.review(id, 'әке');
    await c.review(id, 'әке');
    expect((await uw(22, id)).step).toBe(2);
    const res = (await c.review(id, 'бала')).json();
    expect(res).toMatchObject({ verdict: 'wrong', fix: [], altyn: { earned: 0, balance: 21 }, next: { step: 0 } });
    expect((await user(22)).combo).toBe(0);
    expect(await app.db.select().from(altynLedger)).toHaveLength(2); // wrong не пишет в журнал
  });

  it('hints reduce the reward', async () => {
    const c = client(app, 23);
    const id = await learn(c, 'Әке');
    const res = (await c.review(id, 'әке', { hints: 2 })).json();
    expect(res.verdict).toBe('correct');
    expect(res.altyn.base).toBe(4); // 10 * (1 - 0.6)
  });

  it('after the last short step the word goes to review phase; a lapse returns it to learning', async () => {
    const c = client(app, 24);
    const id = await learn(c, 'Әке');
    await app.db.update(userWords).set({ step: 3 }).where(eq(userWords.wordId, id));
    const res = (await c.review(id, 'әке')).json();
    expect(res.next).toMatchObject({ phase: 'review', step: 0 });
    const days = (new Date(res.next.due_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(0.99);
    expect(days).toBeLessThanOrEqual(1);
    expect((await user(24)).aulStage).toBe(1);

    const lapse = (await c.review(id, 'нет')).json();
    expect(lapse.next).toMatchObject({ phase: 'learning', step: 0 });
    const row = await uw(24, id);
    expect(row.lapses).toBe(1);
    expect(row.ease).toBeCloseTo(2.3);
    expect((await user(24)).aulStage).toBe(0);
  });

  it('is idempotent by client_id: same result, altyn credited once', async () => {
    const c = client(app, 25);
    const id = await learn(c, 'Әке');
    const client_id = randomUUID();
    const first = await c.review(id, 'әке', { client_id });
    const again = await c.review(id, 'әке', { client_id });
    const parallel = await Promise.all([c.review(id, 'әке', { client_id }), c.review(id, 'әке', { client_id })]);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toEqual(first.json());
    for (const p of parallel) expect(p.json()).toEqual(first.json());
    expect(await app.db.select().from(reviews)).toHaveLength(1);
    expect(await app.db.select().from(altynLedger)).toHaveLength(1);
    expect((await user(25)).altyn).toBe(10);
    expect((await uw(25, id)).step).toBe(1);
  });

  it("another user's client_id is a 409", async () => {
    const a = client(app, 26);
    const b = client(app, 27);
    const id = await learn(a, 'Әке');
    await learn(b, 'Әке');
    const client_id = randomUUID();
    expect((await a.review(id, 'әке', { client_id })).statusCode).toBe(200);
    const res = await b.review(id, 'әке', { client_id });
    expect(res.statusCode).toBe(409);
    expect(await app.db.select().from(reviews)).toHaveLength(1);
  });

  it('rejects a word the user has not learned', async () => {
    const c = client(app, 28);
    expect((await c.review(await wordId(app, 'Су'), 'су')).statusCode).toBe(404);
  });

  it('updates the streak by local day', async () => {
    const c = client(app, 29);
    const id = await learn(c, 'Әке');
    const today = localDay(new Date(), 'Asia/Almaty');
    await c.review(id, 'әке');
    expect(await user(29)).toMatchObject({ streakCurrent: 1, streakBest: 1, lastActiveDay: today });
    await c.review(id, 'әке');
    expect((await user(29)).streakCurrent).toBe(1); // тот же день

    await setUser(app, 29, { lastActiveDay: addDays(today, -1), streakCurrent: 4, streakBest: 4 });
    await c.review(id, 'әке');
    expect(await user(29)).toMatchObject({ streakCurrent: 5, streakBest: 5 });

    await setUser(app, 29, { lastActiveDay: addDays(today, -3) });
    await c.review(id, 'әке');
    expect(await user(29)).toMatchObject({ streakCurrent: 1, streakBest: 5 });
  });

  it('progresses daily tasks', async () => {
    const c = client(app, 30);
    const id = await learn(c, 'Әке');
    await c.review(id, 'әке');
    await c.review(id, 'әке');
    await c.review(id, 'xxx');
    const tasks = (await c.get('/v1/home')).json().tasks;
    const get = (code: string) => tasks.find((t: any) => t.code === code).progress;
    expect(get('review_20')).toBe(3);
    expect(get('streak_5')).toBe(2);
    expect(get('learn_5')).toBe(1);
  });
});
