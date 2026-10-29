import { initialState, localDay, type ImportLocalBodySchema } from '@ksoz/shared';
import type { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { userWords, users, words } from '../db/schema.js';
import { conflict } from '../errors.js';
import { refreshAulStage } from './economy.js';

type Body = z.infer<typeof ImportLocalBodySchema>;
const DAY_MS = 86_400_000;

/** Один раз на пользователя переносит прогресс прототипа; сопоставление по казахскому слову. */
export async function importLocal(db: Db, userId: number, body: Body, now = new Date()) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (user!.importedAt) throw conflict('already_imported');

    const entries = Object.entries(body.cards).flatMap(([idx, card]) => {
      const kk = body.words[Number(idx)];
      return kk ? [{ kk: kk.trim(), card }] : [];
    });
    const kks = [...new Set(entries.map((e) => e.kk))];
    const found = kks.length ? await tx.select({ id: words.id, kk: words.kk }).from(words).where(inArray(words.kk, kks)) : [];
    const idByKk = new Map(found.map((w) => [w.kk, w.id]));
    const have = new Set(
      (await tx.select({ id: userWords.wordId }).from(userWords).where(eq(userWords.userId, userId))).map((r) => r.id),
    );

    const todayNum = Math.floor(Date.parse(`${localDay(now, user!.timezone)}T00:00:00Z`) / DAY_MS);
    const rows: (typeof userWords.$inferInsert)[] = [];
    for (const { kk, card } of entries) {
      const wordId = idByKk.get(kk);
      if (!wordId || have.has(wordId)) continue;
      have.add(wordId);
      const base = initialState(now);
      const review = card.interval >= 1;
      const daysLeft = Math.max(0, card.due - todayNum);
      rows.push({
        userId,
        wordId,
        phase: review ? 'review' : 'learning',
        step: 0,
        ease: card.ef,
        intervalDays: review ? Math.round(card.interval) : 0,
        reps: card.reps,
        lapses: 0,
        dueAt: review ? new Date(now.getTime() + daysLeft * DAY_MS) : base.dueAt,
        source: 'lesson',
        // позавчера: импортированные слова не съедают дневной лимит новых
        introducedAt: new Date(now.getTime() - 2 * DAY_MS),
        lastReviewedAt: now,
      });
    }
    if (rows.length) await tx.insert(userWords).values(rows);
    await tx.update(users).set({ importedAt: now }).where(eq(users.id, userId));
    await refreshAulStage(tx, userId);
    return { imported: rows.length, skipped: entries.length - rows.length };
  });
}
