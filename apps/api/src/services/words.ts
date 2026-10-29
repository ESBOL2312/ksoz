import { LEVELS, type Level } from '@ksoz/shared';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { topics, userWords, wordTopics, words } from '../db/schema.js';

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
