import { isoWeek, type Baige } from '@ksoz/shared';
import { and, asc, count, desc, eq, gt, inArray, lt, type SQL } from 'drizzle-orm';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { friendships, users, weeklyScores, type UserRow } from '../db/schema.js';

/** Призы за места недели (алтын). Выдача — задача воркера итогов недели. */
export const BAIGE_PRIZES = [500, 300, 200] as const;
export const BAIGE_TOP = 50;

export async function getBaige(db: Db, user: UserRow, scope: Baige['scope'], now = new Date()): Promise<Baige> {
  const week = isoWeek(now, user.timezone);
  const empty: Baige = { week, scope, top: [], me: { place: null, score: 0 }, prize: null };

  let filter: SQL | undefined;
  if (scope === 'city') {
    if (user.cityId === null) return empty;
    filter = eq(weeklyScores.cityId, user.cityId);
  } else if (scope === 'friends') {
    const ids = (
      await db.select({ id: friendships.friendId }).from(friendships).where(eq(friendships.userId, user.id))
    ).map((r) => r.id);
    filter = inArray(weeklyScores.userId, [user.id, ...ids]);
  }
  const inScope = and(eq(weeklyScores.week, week), filter);

  const rows = await db
    .select({ userId: weeklyScores.userId, firstName: users.firstName, score: weeklyScores.score })
    .from(weeklyScores)
    .innerJoin(users, eq(users.id, weeklyScores.userId))
    .where(inScope)
    .orderBy(desc(weeklyScores.score), asc(weeklyScores.userId))
    .limit(BAIGE_TOP);

  const top = rows.map((r, i) => ({
    place: i + 1,
    user_id: r.userId,
    first_name: r.firstName,
    score: r.score,
  }));

  const mine = rows.find((r) => r.userId === user.id);
  let myScore = mine?.score;
  if (myScore === undefined) {
    const [r] = await db
      .select({ score: weeklyScores.score })
      .from(weeklyScores)
      .where(and(eq(weeklyScores.week, week), eq(weeklyScores.userId, user.id)));
    myScore = r?.score ?? 0;
  }
  let place: number | null = null;
  if (mine || myScore > 0) {
    // при равенстве очков выше тот, у кого меньше id (как в сортировке top)
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(weeklyScores)
      .where(and(inScope, gt(weeklyScores.score, myScore)));
    const [{ t } = { t: 0 }] = await db
      .select({ t: count() })
      .from(weeklyScores)
      .where(and(inScope, eq(weeklyScores.score, myScore), lt(weeklyScores.userId, user.id)));
    place = n + t + 1;
  }
  return { week, scope, top, me: { place, score: myScore }, prize: place ? (BAIGE_PRIZES[place - 1] ?? null) : null };
}

export function inviteLink(config: Config, userId: number): string {
  return `https://t.me/${config.BOT_USERNAME}/${config.WEBAPP_SHORT_NAME}?startapp=ref_${userId}`;
}
