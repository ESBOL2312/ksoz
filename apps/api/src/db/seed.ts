import { eq } from 'drizzle-orm';
import type { Db } from './client.js';
import { PROTOTYPE_WORDS } from './prototype-words.js';
import { CITIES, EXTRA_WORDS, ITEMS, TOPICS } from './seed-data.js';
import { cities, items, topics, wordExamples, words, wordTopics } from './schema.js';

function parseExample(raw: string): { kk: string; ru: string } | null {
  const [kk, ru] = raw.split(' — ').map((s) => s.trim());
  return kk && ru ? { kk, ru } : null;
}

/** Идемпотентный сид: повторный запуск ничего не дублирует и не затирает правки в БД. */
export async function seed(db: Db): Promise<void> {
  const all = [
    ...PROTOTYPE_WORDS.map(([kk, ru, example]) => ({ kk, ru, example, level: 'A1' as const })),
    ...EXTRA_WORDS,
  ];

  await db.transaction(async (tx) => {
    await tx
      .insert(words)
      .values(all.map((w) => ({ kk: w.kk, ru: w.ru, level: w.level, status: 'published' as const })))
      .onConflictDoNothing({ target: words.kk });

    const byKk = new Map(
      (await tx.select({ id: words.id, kk: words.kk }).from(words)).map((w) => [w.kk, w.id]),
    );

    const withExamples = new Set(
      (await tx.selectDistinct({ id: wordExamples.wordId }).from(wordExamples)).map((r) => r.id),
    );
    const exampleRows = all.flatMap((w) => {
      const id = byKk.get(w.kk)!;
      const ex = parseExample(w.example);
      return ex && !withExamples.has(id) ? [{ wordId: id, ...ex, position: 0 }] : [];
    });
    if (exampleRows.length) await tx.insert(wordExamples).values(exampleRows);

    await tx.insert(cities).values([...CITIES]).onConflictDoNothing({ target: cities.nameKk });

    await tx
      .insert(topics)
      .values(TOPICS.map(({ slug, nameKk, nameRu }) => ({ slug, nameKk, nameRu })))
      .onConflictDoNothing({ target: topics.slug });
    const topicIds = new Map(
      (await tx.select({ id: topics.id, slug: topics.slug }).from(topics)).map((t) => [t.slug, t.id]),
    );
    const links = TOPICS.flatMap((t) =>
      t.words.map((kk) => ({ wordId: byKk.get(kk)!, topicId: topicIds.get(t.slug)! })),
    );
    await tx.insert(wordTopics).values(links).onConflictDoNothing();

    await tx
      .insert(items)
      .values(
        ITEMS.map(({ kk, ...rest }) => {
          const wordId = byKk.get(kk);
          if (!wordId) throw new Error(`seed: item word not found: ${kk}`);
          return { wordId, ...rest };
        }),
      )
      .onConflictDoNothing({ target: items.wordId });
  });
}

export async function countSeeded(db: Db): Promise<{ words: number }> {
  const rows = await db.select({ id: words.id }).from(words).where(eq(words.status, 'published'));
  return { words: rows.length };
}
