import { GrammyError } from 'grammy';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { notificationLog, userWords, users, weeklyScores, words } from '../src/db/schema.js';
import { RateLimiter } from '../src/worker/rateLimiter.js';
import { runScan, type SendPayload } from '../src/worker/scan.js';
import { sendReminder, type SendFn } from '../src/worker/send.js';
import { startWorker } from '../src/worker/index.js';
import { hasTestDb, makeTestApp, resetDb, seedDb, testConfig } from './helpers/app.js';
import { pino } from 'pino';

const TZ = 'Etc/GMT-5'; // UTC+5
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+05:00`);
const log = pino({ level: 'silent' });
const fastLimiter = () => new RateLimiter(1000);

describe.skipIf(!hasTestDb)('worker: reminders', () => {
  let app: FastifyInstance;
  let wordIds: number[];

  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
    wordIds = (await app.db.select({ id: words.id }).from(words).limit(5)).map((w) => w.id);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb(app);
  });

  async function addUser(id: number, over: Partial<typeof users.$inferInsert> = {}) {
    await app.db.insert(users).values({ id, firstName: `u${id}`, timezone: TZ, ...over });
  }
  async function addWord(userId: number, wordId: number, dueAt: Date, phase: 'learning' | 'review' = 'learning') {
    await app.db.insert(userWords).values({ userId, wordId, phase, dueAt });
  }
  const scan = async (now: Date) => {
    const jobs: SendPayload[] = [];
    await runScan(app.db, now, async (p) => void jobs.push(p));
    return jobs;
  };
  function recorder() {
    const sent: { userId: number; text: string }[] = [];
    const send: SendFn = async (userId, text) => void sent.push({ userId, text });
    return { sent, send };
  }
  const deps = (send: SendFn, now: Date) => ({ db: app.db, send, limiter: fastLimiter(), log, now: () => now });

  it('scan: short review for due learning word, respecting flags, blocks and quiet hours', async () => {
    const now = at('2026-10-29', '14:00');
    const past = new Date(now.getTime() - 60_000);
    await addUser(1); // due → да
    await addWord(1, wordIds[0]!, past);
    await addUser(2, { botBlocked: true }); // заблокировал
    await addWord(2, wordIds[0]!, past);
    await addUser(3, { notify: { short: false, daily: true, streak: true, baige: true } });
    await addWord(3, wordIds[0]!, past);
    await addUser(4); // слово ещё не пора
    await addWord(4, wordIds[0]!, new Date(now.getTime() + 600_000));
    await addUser(5); // review-слово не даёт short
    await addWord(5, wordIds[0]!, past, 'review');
    await addUser(6, { timezone: 'Etc/GMT+5' }); // у него 04:00 — тихие часы
    await addWord(6, wordIds[0]!, past);

    const jobs = await scan(now);
    expect(jobs).toEqual([expect.objectContaining({ userId: 1, kind: 'short', n: 1 })]);
  });

  it('scan + send: short review is sent once per hour and logged', async () => {
    const now = at('2026-10-29', '14:00');
    await addUser(1);
    await addWord(1, wordIds[0]!, new Date(now.getTime() - 60_000));
    const { sent, send } = recorder();

    for (const p of await scan(now)) expect(await sendReminder(deps(send, now), p)).toBe('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.text).toContain('қайталайтын');
    const logRows = await app.db.select().from(notificationLog);
    expect(logRows).toMatchObject([{ userId: 1, kind: 'short' }]);

    // тот же проход через 30 минут и повторная отправка того же задания ничего не шлют
    const later = new Date(now.getTime() + 30 * 60_000);
    expect(await scan(later)).toEqual([]);
    const dup = await sendReminder(deps(send, later), { userId: 1, kind: 'short', period: 'x' });
    expect(dup).toBe('skipped');
    // через час — снова
    const hourLater = new Date(now.getTime() + 61 * 60_000);
    expect(await scan(hourLater)).toHaveLength(1);
  });

  it('scan: daily reminder at 9:xx local, once per day, with word count', async () => {
    const now = at('2026-10-29', '09:05');
    await addUser(1);
    await addWord(1, wordIds[0]!, new Date(now.getTime() - 3600_000), 'review');
    await addWord(1, wordIds[1]!, new Date(now.getTime() - 3600_000), 'review');
    const { sent, send } = recorder();
    const jobs = await scan(now);
    expect(jobs).toEqual([expect.objectContaining({ userId: 1, kind: 'daily', n: 2 })]);
    await sendReminder(deps(send, now), jobs[0]!);
    expect(sent[0]!.text).toContain('2');
    expect(await scan(at('2026-10-29', '09:30'))).toEqual([]);
    expect(await scan(at('2026-10-30', '09:05'))).toHaveLength(1);
    expect(await scan(at('2026-10-29', '08:55'))).toEqual([]);
  });

  it('scan: streak at risk at 20:xx local', async () => {
    const now = at('2026-10-29', '20:10');
    await addUser(1, { streakCurrent: 4, lastActiveDay: '2026-10-28' });
    await addUser(2, { streakCurrent: 4, lastActiveDay: '2026-10-29' }); // уже занимался
    await addUser(3, { streakCurrent: 0 });
    const jobs = await scan(now);
    expect(jobs).toEqual([expect.objectContaining({ userId: 1, kind: 'streak' })]);
    expect(await scan(at('2026-10-29', '19:10'))).toEqual([]);
  });

  it('scan: baige results on Sunday evening with ranks', async () => {
    const now = at('2026-11-01', '21:10'); // воскресенье, ISO 2026-W44
    for (const id of [1, 2, 3, 4]) await addUser(id);
    await app.db.insert(weeklyScores).values([
      { week: '2026-W44', userId: 1, score: 50 },
      { week: '2026-W44', userId: 2, score: 300 },
      { week: '2026-W44', userId: 3, score: 120 },
      { week: '2026-W44', userId: 4, score: 0 }, // не участвует
    ]);
    const jobs = await scan(now);
    const byUser = Object.fromEntries(jobs.map((j) => [j.userId, j]));
    expect(Object.keys(byUser).sort()).toEqual(['1', '2', '3']);
    expect(byUser[2]).toMatchObject({ kind: 'baige', rank: 1, total: 3, period: '2026-W44' });
    expect(byUser[3]).toMatchObject({ rank: 2 });
    expect(byUser[1]).toMatchObject({ rank: 3 });

    const { sent, send } = recorder();
    await sendReminder(deps(send, now), byUser[2]!);
    expect(sent[0]!.text).toContain('1 / 3');
    expect(await scan(new Date(now.getTime() + 20 * 60_000)).then((j) => j.map((x) => x.userId).sort())).toEqual([1, 3]);
    // не в воскресенье
    expect(await scan(at('2026-10-31', '21:10'))).toEqual([]);
  });

  it('send: Telegram 403 marks the user as blocked, no throw, no log', async () => {
    const now = at('2026-10-29', '14:00');
    await addUser(1);
    const send: SendFn = async () => {
      throw new GrammyError('forbidden', { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 'sendMessage', {});
    };
    const out = await sendReminder(deps(send, now), { userId: 1, kind: 'short', period: 'p' });
    expect(out).toBe('blocked');
    const [u] = await app.db.select().from(users).where(eq(users.id, 1));
    expect(u!.botBlocked).toBe(true);
    expect(await app.db.select().from(notificationLog)).toHaveLength(0);
    // заблокированному больше не пишем
    expect(await sendReminder(deps(send, now), { userId: 1, kind: 'short', period: 'p' })).toBe('skipped');
  });

  it('send: 429 waits retry_after and retries', async () => {
    const now = at('2026-10-29', '14:00');
    await addUser(1);
    let calls = 0;
    const send: SendFn = async () => {
      if (++calls === 1) {
        throw new GrammyError('too many', { ok: false, error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 1 } }, 'sendMessage', {});
      }
    };
    let t = 0;
    const limiter = new RateLimiter(1000, () => t, async (ms) => void (t += ms));
    const out = await sendReminder({ ...deps(send, now), limiter }, { userId: 1, kind: 'short', period: 'p' });
    expect(out).toBe('sent');
    expect(calls).toBe(2);
    expect(t).toBeGreaterThanOrEqual(1000);
  });

  it('send: other errors propagate (pg-boss retries) and nothing is logged', async () => {
    await addUser(1);
    const send: SendFn = async () => {
      throw new Error('network');
    };
    await expect(sendReminder(deps(send, at('2026-10-29', '14:00')), { userId: 1, kind: 'short', period: 'p' })).rejects.toThrow('network');
    expect(await app.db.select().from(notificationLog)).toHaveLength(0);
  });

  it('startWorker starts and stops on pg-boss', async () => {
    await app.db.execute(sql`select 1`);
    const w = await startWorker({ config: testConfig(), db: app.db, log, send: async () => {} });
    await w.stop();
  });
});
