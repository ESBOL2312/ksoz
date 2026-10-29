import { isoWeek, localDay } from '@ksoz/shared';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { altynLedger, dailyTasks, userWords, users } from '../src/db/schema.js';
import { applyAltyn } from '../src/services/altyn.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client, setUser, wordId } from './helpers/api.js';

describe.skipIf(!hasTestDb)('economy', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  const bazaar = async (c: ReturnType<typeof client>) => (await c.get('/v1/bazaar')).json().items as any[];
  const itemFor = async (c: ReturnType<typeof client>, kk: string) => (await bazaar(c)).find((i) => i.kk === kk);

  it('purchase: 409 when poor, success adds the word, 409 when owned, level gate', async () => {
    const c = client(app, 40);
    const takiya = await itemFor(c, 'Тақия');
    expect(takiya).toMatchObject({ status: 'available', price: 80 });

    const poor = await c.post('/v1/bazaar/purchase', { item_id: takiya.id });
    expect(poor.statusCode).toBe(409);
    expect(poor.json().error).toBe('insufficient_altyn');

    await setUser(app, 40, { altyn: 500 });
    const ok = await c.post('/v1/bazaar/purchase', { item_id: takiya.id });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ item_id: takiya.id, balance: 420, next: { phase: 'learning', step: 0 } });
    const [row] = await app.db.select().from(userWords).where(eq(userWords.wordId, takiya.word_id));
    expect(row?.source).toBe('bazaar');
    const ledger = await app.db.select().from(altynLedger);
    expect(ledger).toMatchObject([{ delta: -80, reason: 'purchase' }]);
    expect((await itemFor(c, 'Тақия')).status).toBe('owned');

    expect((await c.post('/v1/bazaar/purchase', { item_id: takiya.id })).statusCode).toBe(409);
    expect((await app.db.select().from(users).where(eq(users.id, 40)))[0]!.altyn).toBe(420);

    const etik = await itemFor(c, 'Етік');
    expect(etik.status).toBe('locked_by_level');
    expect((await c.post('/v1/bazaar/purchase', { item_id: etik.id })).statusCode).toBe(403);
    expect((await c.post('/v1/bazaar/purchase', { item_id: 99999 })).statusCode).toBe(404);
  });

  it('purchase keeps an existing word state', async () => {
    const c = client(app, 41);
    const takiya = await itemFor(c, 'Тақия');
    await setUser(app, 41, { altyn: 100 });
    await app.db.insert(userWords).values({ userId: 41, wordId: takiya.word_id, dueAt: new Date(), reps: 3, source: 'lesson' });
    expect((await c.post('/v1/bazaar/purchase', { item_id: takiya.id })).statusCode).toBe(200);
    const [row] = await app.db.select().from(userWords).where(eq(userWords.userId, 41));
    expect(row).toMatchObject({ reps: 3, source: 'lesson' });
  });

  it('equip: one item per slot', async () => {
    const c = client(app, 42);
    await c.get('/v1/me');
    await setUser(app, 42, { altyn: 2000, level: 'A2' });
    const qoy = await itemFor(c, 'Қой');
    const jylqy = await itemFor(c, 'Жылқы');
    const shapan = await itemFor(c, 'Шапан');
    expect((await c.post('/v1/inventory/equip', { item_id: qoy.id, equipped: true })).statusCode).toBe(404);
    for (const i of [qoy, jylqy, shapan]) await c.post('/v1/bazaar/purchase', { item_id: i.id });

    await c.post('/v1/inventory/equip', { item_id: qoy.id, equipped: true });
    await c.post('/v1/inventory/equip', { item_id: shapan.id, equipped: true });
    let res = await c.post('/v1/inventory/equip', { item_id: jylqy.id, equipped: true });
    expect(res.statusCode).toBe(200);
    expect(res.json().equipped.map((e: any) => e.kk).sort()).toEqual(['Жылқы', 'Шапан']);
    expect((await c.get('/v1/home')).json().equipped).toHaveLength(2);

    res = await c.post('/v1/inventory/equip', { item_id: jylqy.id, equipped: false });
    expect(res.json().equipped.map((e: any) => e.kk)).toEqual(['Шапан']);
    expect((await itemFor(c, 'Шапан')).equipped).toBe(true);
  });

  it('task claim: needs completion, pays once', async () => {
    const c = client(app, 43);
    await c.get('/v1/home');
    expect((await c.post('/v1/tasks/review_20/claim')).statusCode).toBe(409);
    expect((await c.post('/v1/tasks/nope/claim')).statusCode).toBe(404);

    const day = localDay(new Date(), 'Asia/Almaty');
    await app.db
      .update(dailyTasks)
      .set({ progress: 20 })
      .where(and(eq(dailyTasks.userId, 43), eq(dailyTasks.day, day), eq(dailyTasks.code, 'review_20')));
    const ok = await c.post('/v1/tasks/review_20/claim');
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ reward: 15, balance: 15 });
    const again = await c.post('/v1/tasks/review_20/claim');
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe('already_claimed');
    expect((await app.db.select().from(altynLedger))).toMatchObject([{ delta: 15, reason: 'task' }]);
    expect((await c.get('/v1/home')).json().tasks.find((t: any) => t.code === 'review_20').claimed).toBe(true);
  });

  it('import/local: maps by kk, once per user, review phase for interval>=1', async () => {
    const c = client(app, 44);
    const nan = await wordId(app, 'Нан');
    await c.post('/v1/lesson/introduce', { word_id: nan });
    const today = Math.floor(Date.parse(`${localDay(new Date(), 'Asia/Almaty')}T00:00:00Z`) / 86_400_000);
    const body = {
      words: ['Су', 'Нан', 'Жоқтыбар', 'Ет'],
      cards: {
        '0': { reps: 5, interval: 10, ef: 2.3, due: today + 3 },
        '1': { reps: 2, interval: 6, ef: 2.5, due: today },
        '2': { reps: 1, interval: 1, ef: 2.5, due: today },
        '3': { reps: 0, interval: 0, ef: 2.5, due: today },
        '77': { reps: 1, interval: 1, ef: 2.5, due: today },
      },
    };
    const res = await c.post('/v1/import/local', body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ imported: 2, skipped: 2 });
    const rows = await app.db.select().from(userWords).where(eq(userWords.userId, 44));
    const su = rows.find((r) => r.wordId !== nan && r.phase === 'review')!;
    expect(su).toMatchObject({ intervalDays: 10, reps: 5, ease: 2.3 });
    const days = (su.dueAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(2.9);
    expect(days).toBeLessThanOrEqual(3);
    const et = rows.find((r) => r.phase === 'learning' && r.wordId !== nan)!;
    expect(et.intervalDays).toBe(0);
    expect(rows).toHaveLength(3);
    expect((await app.db.select().from(users).where(eq(users.id, 44)))[0]).toMatchObject({ aulStage: 1 });
    // импорт не съедает дневной лимит новых слов (одно слово показано через introduce)
    expect((await c.get('/v1/home')).json().new_left_today).toBe(9);

    const second = await c.post('/v1/import/local', body);
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toBe('already_imported');
    expect(await app.db.select().from(userWords)).toHaveLength(3);
  });

  it('baige: ranking by scope, my place, prize; invite link', async () => {
    const [a, b, d] = [client(app, 51), client(app, 52), client(app, 53)];
    await a.get('/v1/me');
    // 52 приглашён пользователем 51
    await app.inject({
      url: '/v1/me',
      headers: (await import('./helpers/initData.js')).tmaHeader((await import('./helpers/app.js')).BOT_TOKEN, {
        user: { id: 52 },
        startParam: 'ref_51',
      }),
    });
    await d.get('/v1/me');
    await a.patch('/v1/me', { city_id: 1 });
    await d.patch('/v1/me', { city_id: 1 });
    const give = (id: number, n: number) => app.db.transaction((tx) => applyAltyn(tx, id, n, 'prize'));
    await give(51, 100);
    await give(52, 300);
    await give(53, 200);

    const week = isoWeek(new Date(), 'Asia/Almaty');
    const friends = (await a.get('/v1/baige?scope=friends')).json();
    expect(friends.week).toBe(week);
    expect(friends.top.map((t: any) => [t.user_id, t.place, t.score])).toEqual([
      [52, 1, 300],
      [51, 2, 100],
    ]);
    expect(friends.me).toEqual({ place: 2, score: 100 });
    expect(friends.prize).toBe(300);

    const kz = (await a.get('/v1/baige?scope=kz')).json();
    expect(kz.top.map((t: any) => t.user_id)).toEqual([52, 53, 51]);
    expect(kz.me.place).toBe(3);
    expect(kz.prize).toBe(200);

    const city = (await a.get('/v1/baige?scope=city')).json();
    expect(city.top.map((t: any) => t.user_id)).toEqual([53, 51]);
    expect((await b.get('/v1/baige?scope=city')).json()).toMatchObject({ top: [], me: { place: null } });

    const inv = (await a.get('/v1/invite')).json();
    expect(inv.link).toBe('https://t.me/ksoz_bot/app?startapp=ref_51');
  });
});
