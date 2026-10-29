import { addDays, localDay } from '@ksoz/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import { userWords, users } from '../db/schema.js';

/** Сколько слов в фазе review нужно для каждой ступени аула (ступень = число достигнутых порогов). */
export const AUL_THRESHOLDS = [1, 10, 25, 50, 100, 200] as const;

export function aulStageFor(reviewWords: number): number {
  return AUL_THRESHOLDS.filter((t) => reviewWords >= t).length;
}

/** Пересчитывает users.aul_stage по числу слов в фазе review; пишет только при изменении. */
export async function refreshAulStage(tx: Tx, userId: number): Promise<number> {
  const [{ n } = { n: 0 }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(userWords)
    .where(and(eq(userWords.userId, userId), eq(userWords.phase, 'review')));
  const stage = aulStageFor(n);
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
