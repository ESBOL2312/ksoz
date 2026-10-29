import {
  ALTYN,
  initialState,
  localDay,
  nextHint,
  type Lesson,
  type LessonCard,
  type Phase,
} from '@ksoz/shared';
import { and, asc, eq, inArray, lte, notExists, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { userWords, users, wordExamples, words, type UserRow } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';
import { ensureDailyTasks, progressTask } from './tasks.js';

type Q = Db | Tx;

/** Сколько новых слов (source=lesson) показано в локальный день пользователя. */
export async function countIntroducedToday(q: Q, user: { id: number; timezone: string }, now: Date) {
  const day = localDay(now, user.timezone);
  const [row] = await q
    .select({ n: sql<number>`count(*)::int` })
    .from(userWords)
    .where(
      and(
        eq(userWords.userId, user.id),
        eq(userWords.source, 'lesson'),
        sql`(${userWords.introducedAt} AT TIME ZONE ${user.timezone})::date = ${day}::date`,
      ),
    );
  return row?.n ?? 0;
}

export async function newLeftToday(q: Q, user: { id: number; timezone: string }, now: Date) {
  return Math.max(0, ALTYN.NEW_PER_DAY - (await countIntroducedToday(q, user, now)));
}

export async function examplesFor(q: Q, wordIds: number[]) {
  const map = new Map<number, { kk: string; ru: string }[]>();
  if (!wordIds.length) return map;
  const rows = await q
    .select()
    .from(wordExamples)
    .where(inArray(wordExamples.wordId, wordIds))
    .orderBy(asc(wordExamples.wordId), asc(wordExamples.position), asc(wordExamples.id));
  for (const r of rows) {
    const list = map.get(r.wordId) ?? [];
    list.push({ kk: r.kk, ru: r.ru });
    map.set(r.wordId, list);
  }
  return map;
}

export async function getLesson(db: Db, user: UserRow, limit: number, now = new Date()): Promise<Lesson> {
  const due = await db
    .select({
      wordId: words.id,
      kk: words.kk,
      ru: words.ru,
      imageUrl: words.imageUrl,
      audioUrl: words.audioUrl,
      phase: userWords.phase,
      step: userWords.step,
    })
    .from(userWords)
    .innerJoin(words, eq(words.id, userWords.wordId))
    .where(and(eq(userWords.userId, user.id), lte(userWords.dueAt, now)))
    .orderBy(asc(userWords.dueAt), asc(words.id))
    .limit(limit);

  const room = Math.min(limit - due.length, await newLeftToday(db, user, now));
  const fresh =
    room > 0
      ? await db
          .select({
            wordId: words.id,
            kk: words.kk,
            ru: words.ru,
            imageUrl: words.imageUrl,
            audioUrl: words.audioUrl,
          })
          .from(words)
          .where(
            and(
              eq(words.status, 'published'),
              lte(words.level, user.level),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(userWords)
                  .where(and(eq(userWords.userId, user.id), eq(userWords.wordId, words.id))),
              ),
            ),
          )
          .orderBy(asc(words.level), asc(words.id))
          .limit(room)
      : [];

  const examples = await examplesFor(db, [...due.map((d) => d.wordId), ...fresh.map((f) => f.wordId)]);
  const cards: LessonCard[] = [
    ...due.map((d) => ({
      kind: 'review' as const,
      word_id: d.wordId,
      ru: d.ru,
      image_url: d.imageUrl,
      audio_url: d.audioUrl,
      kk: null,
      examples: examples.get(d.wordId) ?? [],
      phase: d.phase as Phase,
      step: d.step,
      length: [...d.kk].length,
    })),
    ...fresh.map((f) => ({
      kind: 'new' as const,
      word_id: f.wordId,
      ru: f.ru,
      image_url: f.imageUrl,
      audio_url: f.audioUrl,
      kk: f.kk,
      examples: examples.get(f.wordId) ?? [],
      phase: 'learning' as const,
      step: 0,
      length: [...f.kk].length,
    })),
  ];
  return { cards };
}

export async function introduceWord(db: Db, user: UserRow, wordId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    // блокировка пользователя сериализует проверку дневного лимита
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for('update');

    const [existing] = await tx
      .select()
      .from(userWords)
      .where(and(eq(userWords.userId, user.id), eq(userWords.wordId, wordId)));
    if (existing) {
      return { next: { phase: existing.phase, step: existing.step, due_at: existing.dueAt.toISOString() } };
    }

    const [word] = await tx.select({ id: words.id, status: words.status }).from(words).where(eq(words.id, wordId));
    if (!word || word.status !== 'published') throw notFound('word_not_found');

    if ((await countIntroducedToday(tx, user, now)) >= ALTYN.NEW_PER_DAY) {
      throw conflict('daily_limit_reached', 'Daily new words limit reached');
    }

    const s = initialState(now);
    await tx.insert(userWords).values({
      userId: user.id,
      wordId,
      phase: s.phase,
      step: s.step,
      ease: s.ease,
      intervalDays: s.intervalDays,
      dueAt: s.dueAt,
      reps: s.reps,
      lapses: s.lapses,
      source: 'lesson',
      introducedAt: now,
    });
    const day = localDay(now, user.timezone);
    await ensureDailyTasks(tx, user.id, day);
    await progressTask(tx, user.id, day, 'learn_5', { inc: 1 });
    return { next: { phase: s.phase, step: s.step, due_at: s.dueAt.toISOString() } };
  });
}

export async function hintFor(db: Db, userId: number, wordId: number, hintsUsed: number) {
  const [row] = await db
    .select({ kk: words.kk })
    .from(userWords)
    .innerJoin(words, eq(words.id, userWords.wordId))
    .where(and(eq(userWords.userId, userId), eq(userWords.wordId, wordId)));
  if (!row) throw notFound('word_not_learned');
  return { hint: nextHint(row.kk, hintsUsed), hints_used: hintsUsed + 1 };
}

