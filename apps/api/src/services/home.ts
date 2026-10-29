import { localDay } from '@ksoz/shared';
import { and, count, eq, lte } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { userWords, type UserRow } from '../db/schema.js';
import { equippedItems } from './bazaar.js';
import { newLeftToday } from './lesson.js';
import { listTasks } from './tasks.js';

export async function getHome(db: Db, user: UserRow, now = new Date()) {
  const [due] = await db
    .select({ n: count() })
    .from(userWords)
    .where(and(eq(userWords.userId, user.id), lte(userWords.dueAt, now)));
  return {
    altyn: user.altyn,
    combo: user.combo,
    streak_current: user.streakCurrent,
    aul_stage: user.aulStage,
    equipped: await equippedItems(db, user.id),
    due_count: due?.n ?? 0,
    new_left_today: await newLeftToday(db, user, now),
    tasks: await listTasks(db, user.id, localDay(now, user.timezone)),
  };
}
