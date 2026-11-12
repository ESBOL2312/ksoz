import { LEVELS, wordGroup, type Level, type MyWords, type Verdict, type WordGroup } from '@ksoz/shared';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { reviews, topics, userWords, wordTopics, words } from '../db/schema.js';
import { examplesFor } from './lesson.js';

export async function listWords(db: Db, userId: number, q: { level?: Level; topic?: string }) {
  const conds = [eq(words.status, 'published')];
  if (q.level) conds.push(eq(words.level, q.level));
  if (q.topic) {
    const ids = db
      .select({ id: wordTopics.wordId })
      .from(wordTopics)
      .innerJoin(topics, eq(topics.id, wordTopics.topicId))
      .where(eq(topics.slug, q.topic));
    conds.push(inArray(words.id, ids));
  }
  const rows = await db
    .select({
      id: words.id,
      kk: words.kk,
      ru: words.ru,
      level: words.level,
      image_url: words.imageUrl,
      uw: userWords,
    })
    .from(words)
    .leftJoin(userWords, and(eq(userWords.wordId, words.id), eq(userWords.userId, userId)))
    .where(and(...conds))
    .orderBy(asc(words.level), asc(words.id));
  return {
    words: rows.map(({ uw, ...w }) => ({
      ...w,
      state: uw
        ? {
            phase: uw.phase,
            step: uw.step,
            due_at: uw.dueAt.toISOString(),
            reps: uw.reps,
            lapses: uw.lapses,
          }
        : null,
    })),
  };
}

export async function listTopics(db: Db) {
  const topicRows = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      name_kk: topics.nameKk,
      name_ru: topics.nameRu,
      words: count(words.id),
    })
    .from(topics)
    .leftJoin(wordTopics, eq(wordTopics.topicId, topics.id))
    .leftJoin(words, and(eq(words.id, wordTopics.wordId), eq(words.status, 'published')))
    .groupBy(topics.id)
    .orderBy(asc(topics.id));
  const levelRows = await db
    .select({ level: words.level, words: count() })
    .from(words)
    .where(eq(words.status, 'published'))
    .groupBy(words.level);
  const byLevel = new Map<string, number>(levelRows.map((r) => [r.level, r.words]));
  return {
    topics: topicRows,
    levels: LEVELS.map((level) => ({ level, words: byLevel.get(level) ?? 0 })),
  };
}

const RECENT = 8;

/**
 * Слова в процессе изучения: короткие повторы и долгие с интервалом < 21 дня.
 * Сначала те, что пора повторить, потом по времени следующего повтора.
 */
export async function listMyWords(db: Db, userId: number, now = new Date()): Promise<MyWords> {
  const rows = await db
    .select({ uw: userWords, kk: words.kk, ru: words.ru, imageUrl: words.imageUrl })
    .from(userWords)
    .innerJoin(words, eq(words.id, userWords.wordId))
    .where(eq(userWords.userId, userId))
    .orderBy(asc(userWords.dueAt), asc(words.id));

  const active = rows.filter((r) => wordGroup(r.uw, now) !== 'mastered');
  const ids = active.map((r) => r.uw.wordId);

  const answers = new Map<number, { correct: number; almost: number; wrong: number }>();
  const recent = new Map<number, Verdict[]>();
  if (ids.length) {
    const counts = await db
      .select({ wordId: reviews.wordId, verdict: reviews.verdict, n: count() })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), inArray(reviews.wordId, ids)))
      .groupBy(reviews.wordId, reviews.verdict);
    for (const c of counts) {
      const a = answers.get(c.wordId) ?? { correct: 0, almost: 0, wrong: 0 };
      a[c.verdict] = c.n;
      answers.set(c.wordId, a);
    }
    const last = await db
      .select({ wordId: reviews.wordId, verdict: reviews.verdict })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          inArray(reviews.wordId, ids),
          sql`${reviews.id} in (
            select r.id from (
              select id, row_number() over (partition by word_id order by created_at desc, id desc) as rn
              from ${reviews} where user_id = ${userId}
            ) r where r.rn <= ${RECENT}
          )`,
        ),
      )
      .orderBy(asc(reviews.createdAt), asc(reviews.id));
    for (const r of last) {
      const list = recent.get(r.wordId) ?? [];
      list.push(r.verdict);
      recent.set(r.wordId, list);
    }
  }
  const examples = await examplesFor(db, ids);

  return {
    mastered: rows.length - active.length,
    words: active.map(({ uw, kk, ru, imageUrl }) => ({
      word_id: uw.wordId,
      kk,
      ru,
      image_url: imageUrl,
      group: wordGroup(uw, now) as Exclude<WordGroup, 'mastered'>,
      phase: uw.phase,
      step: uw.step,
      interval_days: uw.intervalDays,
      due_at: uw.dueAt.toISOString(),
      reps: uw.reps,
      lapses: uw.lapses,
      introduced_at: uw.introducedAt.toISOString(),
      last_reviewed_at: uw.lastReviewedAt?.toISOString() ?? null,
      answers: answers.get(uw.wordId) ?? { correct: 0, almost: 0, wrong: 0 },
      recent: recent.get(uw.wordId) ?? [],
      examples: examples.get(uw.wordId) ?? [],
    })),
  };
}
