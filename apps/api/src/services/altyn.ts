import { isoWeek } from '@ksoz/shared';
import { eq, sql } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import { altynLedger, users, weeklyScores } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';

export type LedgerReason = (typeof altynLedger.$inferInsert)['reason'];

/**
 * Единственный способ менять баланс. Вызывать внутри db.transaction.
 * Блокирует строку пользователя, не даёт уйти в минус, пишет журнал,
 * обновляет users.altyn и (только при положительной дельте) очки недели.
 */
export async function applyAltyn(
  tx: Tx,
  userId: number,
  delta: number,
  reason: LedgerReason,
  refId: string | number | null = null,
  now = new Date(),
): Promise<{ balance: number }> {
  const [user] = await tx
    .select({ altyn: users.altyn, cityId: users.cityId, timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');
  if (!user) throw notFound('user_not_found');

  const balance = user.altyn + delta;
  if (balance < 0) throw conflict('insufficient_altyn', 'Not enough altyn');

  await tx.insert(altynLedger).values({
    userId,
    delta,
    reason,
    refId: refId === null ? null : String(refId),
    createdAt: now,
  });
  await tx.update(users).set({ altyn: balance }).where(eq(users.id, userId));

  if (delta > 0) {
    await tx
      .insert(weeklyScores)
      .values({ week: isoWeek(now, user.timezone), userId, cityId: user.cityId, score: delta })
      .onConflictDoUpdate({
        target: [weeklyScores.week, weeklyScores.userId],
        set: { score: sql`${weeklyScores.score} + ${delta}`, cityId: user.cityId },
      });
  }
  return { balance };
}
