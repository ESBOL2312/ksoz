import { QUEST_REWARD, QuestStepSchema, QuestsResponseSchema } from '@ksoz/shared';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { altynLedger, userQuests, userWords, users, words } from '../src/db/schema.js';
import { TANYSU } from '../src/quests/content.js';
import { hasTestDb, makeTestApp, resetDb, seedDb } from './helpers/app.js';
import { client, setUser, wordId } from './helpers/api.js';

const past = (min: number) => new Date(Date.now() - min * 60_000);

describe.skipIf(!hasTestDb)('quests', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    await seedDb();
    app = await makeTestApp();
  });
  afterAll(() => app.close());
  beforeEach(() => resetDb(app));

  /** Берёт в изучение все слова шага через introduce source=quest. */
  async function learnStep(c: ReturnType<typeof client>, n: number) {
    const step = (await c.get(`/v1/quests/tanysu/steps/${n}`)).json();
    for (const it of step.items) {
      const r = await c.post('/v1/lesson/introduce', { word_id: it.word_id, source: 'quest' });
      expect(r.statusCode).toBe(200);
    }
    return step;
  }

  it('content: life answers and dialog are consistent with items', () => {
    expect(TANYSU.steps).toHaveLength(10);
    TANYSU.steps.forEach((s, i) => {
      const seen = TANYSU.steps.slice(0, i + 1).flatMap((x) => x.items.map((it) => it.kk));
      for (const l of s.life) {
        expect(seen).toContain(l.answer);
        expect(l.text).toContain('___');
      }
    });
    expect(TANYSU.steps[9]!.dialog!.length).toBeGreaterThan(0);
  });

  it('seed: quest items are published words, phrases marked, prototype words reused', async () => {
    const all = TANYSU.steps.flatMap((s) => s.items);
    for (const it of all) {
      const [w] = await app.db.select().from(words).where(eq(words.kk, it.kk));
      expect(w, it.kk).toBeDefined();
      expect(w!.status).toBe('published');
      expect(w!.kind).toBe(it.kind);
    }
    expect((await app.db.select().from(words).where(eq(words.kk, 'Сәлем')))).toHaveLength(1);
  });

  it('GET /v1/quests: initial progress', async () => {
    const c = client(app, 501);
    const res = await c.get('/v1/quests');
    expect(res.statusCode).toBe(200);
    const body = QuestsResponseSchema.parse(res.json());
    expect(body.new_left_today).toBe(10);
    const q = body.quests.find((x) => x.slug === 'tanysu')!;
    expect(q).toMatchObject({ steps_total: 10, steps_done: 0, completed: false, current_blocked: null });
    expect(q.steps.map((s) => s.status)).toEqual(['current', ...Array(9).fill('locked')]);
    expect(q.steps[0]!.new_count).toBe(4);
    expect(q.steps[9]!.new_count).toBe(0);
  });

  it('step payload shape, locked step, unknown quest/step', async () => {
    const c = client(app, 502);
    const res = await c.get('/v1/quests/tanysu/steps/1');
    expect(res.statusCode).toBe(200);
    const step = QuestStepSchema.parse(res.json());
    expect(step).toMatchObject({ slug: 'tanysu', n: 1, steps_total: 10, npc: 'Айгүл', review: [], dialog: [] });
    expect(step.items.map((i) => i.kk)).toEqual(['Сәлем', 'Сәлеметсіз бе', 'Қайырлы таң', 'Қайырлы кеш']);
    expect(step.items.every((i) => i.state === 'new')).toBe(true);
    expect(step.items[1]).toMatchObject({ kind: 'phrase', note: 'Старшим и незнакомым, вежливо' });
    expect(step.items[1]!.examples).toEqual([{ kk: 'Сәлеметсіз бе, апа!', ru: 'Здравствуйте!' }]);
    expect(step.distractors.length).toBeGreaterThan(30);
    expect(step.life).toHaveLength(4);
    for (const l of step.life) {
      expect(l.options).toContain(l.answer);
      expect(new Set(l.options).size).toBe(l.options.length);
      expect(l.options.length).toBe(4);
      // только слова этого и прошлых шагов
      for (const o of l.options) expect(step.items.map((i) => i.kk)).toContain(o);
    }

    const locked = await c.get('/v1/quests/tanysu/steps/2');
    expect(locked.statusCode).toBe(409);
    expect(locked.json().error).toBe('step_locked');
    expect((await c.get('/v1/quests/nope/steps/1')).statusCode).toBe(404);
    expect((await c.get('/v1/quests/tanysu/steps/11')).statusCode).toBe(404);
    expect((await c.post('/v1/quests/tanysu/steps/2/complete')).statusCode).toBe(409);
  });

  it('complete flow: words required, reward, idempotency, streak', async () => {
    const c = client(app, 503);
    await c.get('/v1/me');
    const missing = await c.post('/v1/quests/tanysu/steps/1/complete');
    expect(missing.statusCode).toBe(409);
    expect(missing.json().error).toBe('step_words_missing');

    await learnStep(c, 1);
    const uw = await app.db.select().from(userWords).where(eq(userWords.userId, 503));
    expect(uw).toHaveLength(4);
    expect(new Set(uw.map((r) => r.source))).toEqual(new Set(['quest']));
    // Сәлем теперь в изучении
    const again = (await c.get('/v1/quests/tanysu/steps/1')).json();
    expect(again.items.every((i: any) => i.state === 'learning')).toBe(true);

    const done = await c.post('/v1/quests/tanysu/steps/1/complete');
    expect(done.statusCode).toBe(200);
    expect(done.json()).toEqual({ reward: QUEST_REWARD.STEP, balance: QUEST_REWARD.STEP, quest_completed: false, next_step: 2 });
    const repeat = await c.post('/v1/quests/tanysu/steps/1/complete');
    expect(repeat.json()).toEqual({ reward: 0, balance: QUEST_REWARD.STEP, quest_completed: false, next_step: 2 });

    const ledger = await app.db.select().from(altynLedger).where(eq(altynLedger.userId, 503));
    expect(ledger).toEqual([expect.objectContaining({ delta: QUEST_REWARD.STEP, reason: 'quest', refId: 'tanysu:1' })]);
    const [u] = await app.db.select().from(users).where(eq(users.id, 503));
    expect(u!.streakCurrent).toBe(1);

    const list = (await c.get('/v1/quests')).json().quests[0];
    expect(list.steps_done).toBe(1);
    expect(list.steps.slice(0, 3).map((s: any) => s.status)).toEqual(['done', 'current', 'locked']);
    // пройденный шаг можно открыть снова, следующий — тоже
    expect((await c.get('/v1/quests/tanysu/steps/1')).statusCode).toBe(200);
    expect((await c.get('/v1/quests/tanysu/steps/2')).statusCode).toBe(200);
    expect((await c.get('/v1/quests/tanysu/steps/3')).statusCode).toBe(409);
  });

  it('last step: dialog options and quest reward', async () => {
    const c = client(app, 504);
    await c.get('/v1/me');
    await app.db.insert(userQuests).values({ userId: 504, questSlug: 'tanysu', stepsDone: 9 });
    const step = QuestStepSchema.parse((await c.get('/v1/quests/tanysu/steps/10')).json());
    expect(step.items).toEqual([]);
    expect(step.dialog).toHaveLength(10);
    for (const d of step.dialog) {
      if (d.who === 'npc') expect(d.options).toBeNull();
      else {
        expect(d.options).toHaveLength(3);
        expect(d.options).toContain(d.kk);
      }
    }
    const res = (await c.post('/v1/quests/tanysu/steps/10/complete')).json();
    expect(res).toEqual({
      reward: QUEST_REWARD.STEP + QUEST_REWARD.QUEST,
      balance: QUEST_REWARD.STEP + QUEST_REWARD.QUEST,
      quest_completed: true,
      next_step: null,
    });
    const [row] = await app.db.select().from(userQuests).where(eq(userQuests.userId, 504));
    expect(row!.completedAt).not.toBeNull();
    expect((await c.post('/v1/quests/tanysu/steps/10/complete')).json()).toMatchObject({ reward: 0, quest_completed: true });
    const q = (await c.get('/v1/quests')).json().quests[0];
    expect(q).toMatchObject({ completed: true, steps_done: 10, current_blocked: null });
  });

  it('review cards: due words of earlier steps with choice options', async () => {
    const c = client(app, 505);
    await learnStep(c, 1);
    await c.post('/v1/quests/tanysu/steps/1/complete');
    await app.db.update(userWords).set({ dueAt: past(5) }).where(eq(userWords.userId, 505));
    const step = QuestStepSchema.parse((await c.get('/v1/quests/tanysu/steps/2')).json());
    expect(step.review).toHaveLength(4);
    const kks = TANYSU.steps[0]!.items.map((i) => i.kk);
    for (const r of step.review) {
      expect(r.options.length).toBe(4);
      expect(r.options.filter((o) => kks.includes(o)).length).toBeGreaterThanOrEqual(1);
      expect(r).not.toHaveProperty('kk');
    }
    // слова шага 2 повторами шага 2 не считаются
    expect(step.review.map((r) => r.word_id)).not.toContain(await wordId(app, 'Рақмет'));
  });

  it('daily new-word limit is shared between lesson and quest', async () => {
    const c = client(app, 506);
    const fresh = (await c.get('/v1/lesson?limit=8')).json().cards;
    for (const x of fresh) await c.post('/v1/lesson/introduce', { word_id: x.word_id });
    const q = (await c.get('/v1/quests')).json();
    expect(q.new_left_today).toBe(2);
    expect(q.quests[0].current_blocked).toBe('daily_limit');

    const step = (await c.get('/v1/quests/tanysu/steps/1')).json();
    const notLearned = step.items.filter((i: any) => i.state === 'new');
    expect((await c.post('/v1/lesson/introduce', { word_id: notLearned[0].word_id, source: 'quest' })).statusCode).toBe(200);
    expect((await c.post('/v1/lesson/introduce', { word_id: notLearned[1].word_id, source: 'quest' })).statusCode).toBe(200);
    const over = await c.post('/v1/lesson/introduce', { word_id: notLearned[2].word_id, source: 'quest' });
    expect(over.statusCode).toBe(409);
    expect(over.json().error).toBe('daily_limit_reached');
    expect((await c.get('/v1/home')).json().new_left_today).toBe(0);
    expect((await c.get('/v1/lesson')).json().cards).toHaveLength(0);
  });

  it('normal lesson never offers phrases as new words', async () => {
    const c = client(app, 507);
    const phraseIds = new Set(
      (await app.db.select({ id: words.id }).from(words).where(eq(words.kind, 'phrase'))).map((w) => w.id),
    );
    expect(phraseIds.size).toBeGreaterThan(10);
    // B2 — в очереди новые слова всех уровней
    await setUser(app, 507, { level: 'B2' });
    for (let i = 0; i < 6; i++) {
      const cards = (await c.get('/v1/lesson?limit=50')).json().cards;
      if (!cards.length) break;
      for (const x of cards) {
        expect(phraseIds.has(x.word_id)).toBe(false);
        expect(x.options).toBeNull();
      }
      // «уже знаю» не тратит лимит: прогоняем весь словарь
      for (const x of cards) await c.post('/v1/lesson/known', { word_id: x.word_id });
    }
  });

  it('choice review: half reward, no penalty, same SRS move; idempotent', async () => {
    const c = client(app, 508);
    const a = await wordId(app, 'Сәлеметсіз бе');
    await c.post('/v1/lesson/introduce', { word_id: a, source: 'quest' });
    await setUser(app, 508, { altyn: 50 });

    const typed = client(app, 509);
    const b = await wordId(app, 'Су');
    await typed.post('/v1/lesson/introduce', { word_id: b });
    const t = (await typed.review(b, 'Су')).json();

    const payload = { client_id: randomUUID(), word_id: a, input: 'Сәлеметсіз бе', hints: 0, ms: 900, mode: 'choice' };
    const ok = await c.post('/v1/reviews', payload);
    expect(ok.statusCode).toBe(200);
    const r = ok.json();
    expect(r.verdict).toBe('correct');
    expect(r.altyn.earned).toBe(Math.floor(t.altyn.earned / 2));
    expect(r.altyn.base + r.altyn.combo).toBe(r.altyn.earned);
    expect(r.altyn.balance).toBe(50 + r.altyn.earned);
    expect(r.next).toMatchObject({ phase: t.next.phase, step: t.next.step });
    expect((await c.post('/v1/reviews', payload)).json()).toEqual(r);

    const wrong = (await c.review(a, 'Қайырлы таң', { mode: 'choice' })).json();
    expect(wrong.verdict).toBe('wrong');
    expect(wrong.altyn).toMatchObject({ earned: 0, lost: 0, balance: r.altyn.balance });
    expect(wrong.next.step).toBe(0);
    const [uw] = await app.db
      .select()
      .from(userWords)
      .where(and(eq(userWords.userId, 508), eq(userWords.wordId, a)));
    expect(uw!.step).toBe(0);
  });

  it('lesson review: quest words get card options, other words do not', async () => {
    const c = client(app, 510);
    await learnStep(c, 1);
    const su = await wordId(app, 'Су');
    await c.post('/v1/lesson/introduce', { word_id: su });
    await app.db.update(userWords).set({ dueAt: past(5) }).where(eq(userWords.userId, 510));

    const cards = (await c.get('/v1/lesson?only=review&limit=50')).json().cards;
    expect(cards).toHaveLength(5);
    const stepKk = TANYSU.steps[0]!.items.map((i) => i.kk);
    const questKk = TANYSU.steps.flatMap((s) => s.items.map((i) => i.kk));
    for (const x of cards) {
      expect(x.kk).toBeNull();
      if (x.word_id === su) {
        expect(x.options).toBeNull();
        continue;
      }
      const [w] = await app.db.select().from(words).where(eq(words.id, x.word_id));
      expect(x.options).toHaveLength(4);
      expect(x.options).toContain(w!.kk);
      expect(new Set(x.options).size).toBe(4);
      for (const o of x.options) expect(questKk).toContain(o);
      // неверные — прежде всего из того же квеста
      expect(x.options.filter((o: string) => stepKk.includes(o)).length).toBeGreaterThanOrEqual(1);
    }
  });
});
