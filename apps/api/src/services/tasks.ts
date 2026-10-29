import { localDay, type DailyTask } from '@ksoz/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { dailyTasks, type UserRow } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';
import { applyAltyn } from './altyn.js';

type Q = Db | Tx;

export const TASK_DEFS = [
  { code: 'review_20', target: 20, reward: 15 }, // ответить на 20 карточек
  { code: 'learn_5', target: 5, reward: 20 }, // выучить 5 новых слов
  { code: 'streak_5', target: 5, reward: 25 }, // 5 верных подряд
] as const;
export type TaskCode = (typeof TASK_DEFS)[number]['code'];

/** Три задания создаются при первом обращении за локальный день. */
export async function ensureDailyTasks(q: Q, userId: number, day: string): Promise<void> {
  await q
    .insert(dailyTasks)
    .values(TASK_DEFS.map((t) => ({ userId, day, code: t.code, target: t.target, reward: t.reward })))
    .onConflictDoNothing();
}

/** inc — прибавить; atLeast — поднять прогресс до значения. Прогресс не выше цели. */
export async function progressTask(
  q: Q,
  userId: number,
  day: string,
  code: TaskCode,
  change: { inc: number } | { atLeast: number },
): Promise<void> {
  const next =
    'inc' in change
      ? sql`least(${dailyTasks.target}, ${dailyTasks.progress} + ${change.inc})`
      : sql`least(${dailyTasks.target}, greatest(${dailyTasks.progress}, ${change.atLeast}))`;
  await q
    .update(dailyTasks)
    .set({ progress: next })
    .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.day, day), eq(dailyTasks.code, code)));
}

export async function listTasks(q: Q, userId: number, day: string): Promise<DailyTask[]> {
  await ensureDailyTasks(q, userId, day);
  const rows = await q
    .select()
    .from(dailyTasks)
    .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.day, day)));
  const order = new Map<string, number>(TASK_DEFS.map((t, i) => [t.code, i]));
  return rows
    .sort((a, b) => (order.get(a.code) ?? 99) - (order.get(b.code) ?? 99))
    .map((r) => ({
      code: r.code,
      progress: r.progress,
      target: r.target,
      reward: r.reward,
      claimed: r.claimedAt !== null,
    }));
}

export async function claimTask(
  db: Db,
  user: UserRow,
  code: string,
  now = new Date(),
): Promise<{ reward: number; balance: number }> {
  const day = localDay(now, user.timezone);
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(dailyTasks)
      .where(and(eq(dailyTasks.userId, user.id), eq(dailyTasks.day, day), eq(dailyTasks.code, code)))
      .for('update');
    if (!task) throw notFound('task_not_found');
    if (task.claimedAt) throw conflict('already_claimed');
    if (task.progress < task.target) throw conflict('task_incomplete');
    await tx.update(dailyTasks).set({ claimedAt: now }).where(
      and(eq(dailyTasks.userId, user.id), eq(dailyTasks.day, day), eq(dailyTasks.code, code)),
    );
    const { balance } = await applyAltyn(tx, user.id, task.reward, 'task', `${day}:${code}`, now);
    return { reward: task.reward, balance };
  });
}
