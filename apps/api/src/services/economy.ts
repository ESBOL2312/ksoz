import { addDays, aulStageFor, localDay } from '@ksoz/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { userWords, users } from '../db/schema.js';

export { AUL_THRESHOLDS, aulStageFor } from '@ksoz/shared';

/** Число слов пользователя в фазе review (от него зависит ступень аула). */
export async function countReviewWords(tx: Tx | Db, userId: number): Promise<number> {
  const [{ n } = { n: 0 }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.phase, 'review')));
  return n;
}

/** Пересчитывает users.aul_stage по числу слов в фазе review; пишет только при изменении. */
export async function refreshAulStage(tx: Tx, userId: number): Promise<number> {
  const stage = aulStageFor(await countReviewWords(tx, userId));
  await tx
    .update(users)
    .set({ aulStage: stage })
    .where(and(eq(users.id, userId), sql`${users.aulStage} <> ${stage}`));
  return stage;
}

/** Серия по локальным дням: вчера → +1, сегодня → без изменений, пропуск → 1. */
export function nextStreak(
  user: { streakCurrent: number; streakBest: number; lastActiveDay: string | null },
  now: Date,
  timezone: string,
): { streakCurrent: number; streakBest: number; lastActiveDay: string } {
  const today = localDay(now, timezone);
  let current = user.streakCurrent;
  if (user.lastActiveDay !== today) {
    current = user.lastActiveDay === addDays(today, -1) ? user.streakCurrent + 1 : 1;
  }
  return { streakCurrent: current, streakBest: Math.max(user.streakBest, current), lastActiveDay: today };
}
