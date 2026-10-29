import { isoWeek } from '@ksoz/shared';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { notificationLog, users } from '../db/schema.js';
import type { BaigeResult, ReminderKind, UserSnapshot } from './rules.js';

const KINDS: ReminderKind[] = ['short', 'daily', 'streak', 'baige'];

/** ISO-недели, в которых «сейчас» может находиться пользователь в любом часовом поясе. */
export function candidateWeeks(now: Date): string[] {
  return [...new Set([isoWeek(now, 'Pacific/Kiritimati'), isoWeek(now, 'Etc/GMT+12')])];
}

/** drizzle/node-postgres отдаёт timestamptz из db.execute строкой. */
function toDate(v: Date | string | null | undefined): Date | null {
  return v == null ? null : new Date(v);
}

interface Row extends Record<string, unknown> {
  id: string;
  timezone: string;
  notify: unknown;
  streak_current: number;
  last_active_day: string | null;
  due_learning: number;
  due_total: number;
  l_short: Date | string | null;
  l_daily: Date | string | null;
  l_streak: Date | string | null;
  l_baige: Date | string | null;
  l_any: Date | string | null;
}

/**
 * Пользователи, которым вообще может что-то понадобиться (не заблокировали бота и есть слова к повтору,
 * серия или очки недели), вместе с агрегатами для чистых правил. Одним запросом.
 */
export async function loadCandidates(db: Db, now: Date): Promise<UserSnapshot[]> {
  const nowIso = now.toISOString();
  const weeks = candidateWeeks(now);
  const weekList = sql.join(weeks.map((w) => sql`${w}`), sql`, `);
  const res = await db.execute<Row>(sql`
    select u.id::text as id, u.timezone, u.notify, u.streak_current, u.last_active_day::text as last_active_day,
           coalesce(w.learning, 0) as due_learning, coalesce(w.total, 0) as due_total,
           l.l_short, l.l_daily, l.l_streak, l.l_baige, l.l_any
    from users u
    left join lateral (
      select (count(*) filter (where phase = 'learning'))::int as learning, count(*)::int as total
      from user_words where user_id = u.id and due_at <= ${nowIso}::timestamptz
    ) w on true
    left join lateral (
      select max(sent_at) filter (where kind = 'short') as l_short,
             max(sent_at) filter (where kind = 'daily') as l_daily,
             max(sent_at) filter (where kind = 'streak') as l_streak,
             max(sent_at) filter (where kind = 'baige') as l_baige,
             max(sent_at) as l_any
      from notification_log where user_id = u.id and sent_at > ${nowIso}::timestamptz - interval '10 days'
    ) l on true
    where u.bot_blocked = false
      and (u.streak_current > 0 or coalesce(w.total, 0) > 0
           or exists (select 1 from weekly_scores s where s.user_id = u.id and s.score > 0 and s.week in (${weekList})))
  `);
  return res.rows.map((r) => ({
    id: Number(r.id),
    timezone: r.timezone,
    notify: r.notify,
    botBlocked: false,
    streakCurrent: r.streak_current,
    lastActiveDay: r.last_active_day,
    dueLearning: r.due_learning,
    dueTotal: r.due_total,
    lastSent: Object.fromEntries(
      KINDS.map((k) => [k, toDate(r[`l_${k}`])] as const).filter(([, v]) => v !== null),
    ) as UserSnapshot['lastSent'],
    lastAnySent: toDate(r.l_any),
  }));
}

/** Место каждого из userIds в рейтинге недели (все участники с очками > 0). */
export async function loadBaigeResults(
  db: Db,
  week: string,
  userIds: number[],
): Promise<Map<number, BaigeResult>> {
  const out = new Map<number, BaigeResult>();
  if (userIds.length === 0) return out;
  const idList = sql.join(userIds.map((i) => sql`${i}`), sql`, `);
  const res = await db.execute<{ user_id: string; score: number; rank: number; total: number }>(sql`
    select user_id::text as user_id, score, rank::int as rank, total::int as total from (
      select user_id, score, rank() over (order by score desc) as rank, count(*) over () as total
      from weekly_scores where week = ${week} and score > 0
    ) t where user_id in (${idList})
  `);
  for (const r of res.rows) out.set(Number(r.user_id), { score: r.score, rank: r.rank, total: r.total });
  return out;
}

export async function getUserForSend(db: Db, id: number) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return u;
}

export async function markBlocked(db: Db, id: number): Promise<void> {
  await db.update(users).set({ botBlocked: true }).where(eq(users.id, id));
}

export async function logSent(db: Db, userId: number, kind: ReminderKind, at: Date): Promise<void> {
  await db.insert(notificationLog).values({ userId, kind, sentAt: at });
}

/** Время последней отправки напоминания этого вида (защита от дублей между сканом и отправкой). */
export async function lastSentAt(db: Db, userId: number, kind: ReminderKind): Promise<Date | null> {
  const res = await db.execute<{ t: Date | string | null }>(sql`
    select max(sent_at) as t from notification_log where user_id = ${userId} and kind = ${kind}
  `);
  return toDate(res.rows[0]?.t);
}
