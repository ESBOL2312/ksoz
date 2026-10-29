import { LevelSchema, WordStatusSchema, type AdminWord } from '@ksoz/shared';
import { and, asc, count, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { items, topics, userWords, wordExamples, words, wordTopics } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';

type Q = Db | Tx;

export interface WordInput {
  kk: string;
  kk_latn?: string | null;
  ru: string;
  en?: string | null;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  status: 'draft' | 'reviewed' | 'published';
  audio_url?: string | null;
  examples: { kk: string; ru: string }[];
  topics: string[];
}

async function topicIdsBySlug(tx: Q, slugs: string[]): Promise<number[]> {
  if (!slugs.length) return [];
  const unique = [...new Set(slugs)];
  await tx
    .insert(topics)
    .values(unique.map((slug) => ({ slug, nameKk: slug, nameRu: slug })))
    .onConflictDoNothing({ target: topics.slug });
  const rows = await tx.select({ id: topics.id }).from(topics).where(inArray(topics.slug, unique));
  return rows.map((r) => r.id);
}

async function setTopics(tx: Q, wordId: number, slugs: string[]) {
  await tx.delete(wordTopics).where(eq(wordTopics.wordId, wordId));
  const ids = await topicIdsBySlug(tx, slugs);
  if (ids.length) await tx.insert(wordTopics).values(ids.map((topicId) => ({ wordId, topicId })));
}

async function setExamples(tx: Q, wordId: number, examples: { kk: string; ru: string }[]) {
  await tx.delete(wordExamples).where(eq(wordExamples.wordId, wordId));
  if (examples.length) {
    await tx.insert(wordExamples).values(examples.map((e, position) => ({ wordId, ...e, position })));
  }
}

export async function loadWords(q: Q, ids: number[]): Promise<AdminWord[]> {
  if (!ids.length) return [];
  const rows = await q.select().from(words).where(inArray(words.id, ids)).orderBy(asc(words.id));
  const ex = await q
    .select()
    .from(wordExamples)
    .where(inArray(wordExamples.wordId, ids))
    .orderBy(asc(wordExamples.position), asc(wordExamples.id));
  const tp = await q
    .select({ wordId: wordTopics.wordId, slug: topics.slug })
    .from(wordTopics)
    .innerJoin(topics, eq(topics.id, wordTopics.topicId))
    .where(inArray(wordTopics.wordId, ids));
  return rows.map((w) => ({
    id: w.id,
    kk: w.kk,
    kk_latn: w.kkLatn,
    ru: w.ru,
    en: w.en,
    level: w.level,
    image_url: w.imageUrl,
    audio_url: w.audioUrl,
    status: w.status,
    examples: ex.filter((e) => e.wordId === w.id).map((e) => ({ kk: e.kk, ru: e.ru })),
    topics: tp.filter((t) => t.wordId === w.id).map((t) => t.slug),
  }));
}

export async function listAdminWords(
  db: Db,
  f: { status?: string; level?: string; q?: string; limit: number; offset: number },
) {
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(words.status, f.status as WordInput['status']));
  if (f.level) conds.push(eq(words.level, f.level as WordInput['level']));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, '\\$&')}%`;
    conds.push(or(ilike(words.kk, like), ilike(words.ru, like))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [total] = await db.select({ n: count() }).from(words).where(where);
  const ids = (
    await db.select({ id: words.id }).from(words).where(where).orderBy(asc(words.id)).limit(f.limit).offset(f.offset)
  ).map((r) => r.id);
  return { words: await loadWords(db, ids), total: total?.n ?? 0 };
}

export async function getAdminWord(db: Db, id: number): Promise<AdminWord> {
  const [w] = await loadWords(db, [id]);
  if (!w) throw notFound('word_not_found');
  return w;
}

export async function createWord(db: Db, input: WordInput): Promise<AdminWord> {
  const id = await db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: words.id }).from(words).where(eq(words.kk, input.kk));
    if (exists) throw conflict('word_exists');
    const [w] = await tx
      .insert(words)
      .values({
        kk: input.kk,
        kkLatn: input.kk_latn ?? null,
        ru: input.ru,
        en: input.en ?? null,
        level: input.level,
        status: input.status,
        audioUrl: input.audio_url ?? null,
      })
      .returning({ id: words.id });
    await setExamples(tx, w!.id, input.examples);
    await setTopics(tx, w!.id, input.topics);
    return w!.id;
  });
  return getAdminWord(db, id);
}

export async function updateWord(db: Db, id: number, p: Partial<WordInput>): Promise<AdminWord> {
  await db.transaction(async (tx) => {
    const [cur] = await tx.select({ id: words.id }).from(words).where(eq(words.id, id)).for('update');
    if (!cur) throw notFound('word_not_found');
    if (p.kk !== undefined) {
      const [dup] = await tx.select({ id: words.id }).from(words).where(eq(words.kk, p.kk));
      if (dup && dup.id !== id) throw conflict('word_exists');
    }
    const set: Partial<typeof words.$inferInsert> = {};
    if (p.kk !== undefined) set.kk = p.kk;
    if (p.kk_latn !== undefined) set.kkLatn = p.kk_latn;
    if (p.ru !== undefined) set.ru = p.ru;
    if (p.en !== undefined) set.en = p.en;
    if (p.level !== undefined) set.level = p.level;
    if (p.status !== undefined) set.status = p.status;
    if (p.audio_url !== undefined) set.audioUrl = p.audio_url;
    if (Object.keys(set).length) await tx.update(words).set(set).where(eq(words.id, id));
    if (p.examples) await setExamples(tx, id, p.examples);
    if (p.topics) await setTopics(tx, id, p.topics);
  });
  return getAdminWord(db, id);
}

export async function deleteWord(db: Db, id: number): Promise<void> {
  const [used] = await db.select({ n: count() }).from(userWords).where(eq(userWords.wordId, id));
  const [item] = await db.select({ id: items.id }).from(items).where(eq(items.wordId, id));
  if ((used?.n ?? 0) > 0 || item) throw conflict('word_in_use', 'Word is used by users or the bazaar');
  const res = await db.delete(words).where(eq(words.id, id)).returning({ id: words.id });
  if (!res.length) throw notFound('word_not_found');
}

export async function setWordStatus(db: Db, id: number, status: WordInput['status']) {
  return updateWord(db, id, { status: WordStatusSchema.parse(status) });
}

export async function setWordImage(db: Db, id: number, imageUrl: string | null) {
  const res = await db.update(words).set({ imageUrl }).where(eq(words.id, id)).returning({ id: words.id });
  if (!res.length) throw notFound('word_not_found');
  return getAdminWord(db, id);
}

/** Разбор CSV (RFC 4180: кавычки, запятые и переводы строк в кавычках). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * Колонки: kk,ru,level,topic,example_kk,example_ru. Upsert по kk, статус — draft
 * (после правки слово снова требует проверки носителем). topic — slug(и) через «|».
 * Пример добавляется, если такого ещё нет. Ошибки строк не прерывают импорт.
 */
export async function importCsv(db: Db, text: string) {
  const rows = parseCsv(text);
  const hasHeader = rows[0]?.[0]?.trim().toLowerCase() === 'kk';
  if (hasHeader) rows.shift();
  const startLine = hasHeader ? 2 : 1;
  let created = 0;
  let updated = 0;
  const errors: { line: number; error: string }[] = [];

  for (const [i, r] of rows.entries()) {
    const line = startLine + i;
    const [kk = '', ru = '', level = '', topic = '', exKk = '', exRu = ''] = r.map((x) => x.trim());
    const lv = LevelSchema.safeParse(level || 'A1');
    if (!kk || !ru) errors.push({ line, error: 'kk and ru are required' });
    else if (!lv.success) errors.push({ line, error: `invalid level: ${level}` });
    else {
      await db.transaction(async (tx) => {
        const [prev] = await tx.select({ id: words.id }).from(words).where(eq(words.kk, kk));
        const [w] = await tx
          .insert(words)
          .values({ kk, ru, level: lv.data, status: 'draft' })
          .onConflictDoUpdate({
            target: words.kk,
            set: { ru, level: lv.data, status: 'draft' },
          })
          .returning({ id: words.id });
        if (prev) updated++;
        else created++;
        const slugs = topic.split('|').map((s) => s.trim()).filter(Boolean);
        if (slugs.length) {
          const ids = await topicIdsBySlug(tx, slugs);
          await tx.insert(wordTopics).values(ids.map((topicId) => ({ wordId: w!.id, topicId }))).onConflictDoNothing();
        }
        if (exKk && exRu) {
          const [dup] = await tx
            .select({ id: wordExamples.id })
            .from(wordExamples)
            .where(and(eq(wordExamples.wordId, w!.id), eq(wordExamples.kk, exKk)));
          if (!dup) {
            const [n] = await tx.select({ n: count() }).from(wordExamples).where(eq(wordExamples.wordId, w!.id));
            await tx.insert(wordExamples).values({ wordId: w!.id, kk: exKk, ru: exRu, position: n?.n ?? 0 });
          }
        }
      });
    }
  }
  return { created, updated, errors };
}

