import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';

export interface UserStats {
  total: number;
  new1d: number;
  new7d: number;
  active1d: number;
  active7d: number;
  blocked: number;
  answers1d: number;
  answers7d: number;
  /** в среднем дней с ответами за 7 дней у активного */
  avgDays7d: number;
  newWords7d: number;
  streak3: number;
  streak7: number;
  /** пришли 2–31 день назад / из них ответили на следующий день */
  d1Base: number;
  d1Back: number;
  /** пришли 14–43 дня назад / из них ответили на 7–13-й день */
  d7Base: number;
  d7Back: number;
}

/** Сводка для команды /stats. Активный — ответил хотя бы на одно слово. Дни — по Алматы. */
export async function userStats(db: Db): Promise<UserStats> {
  const res = await db.execute<Record<keyof UserStats, number>>(sql`
    with
      r7 as (
        select user_id, created_at, (created_at at time zone 'Asia/Almaty')::date as day
        from reviews where created_at > now() - interval '7 days'
      ),
      u as (
        select id, (created_at at time zone 'Asia/Almaty')::date as day from users
      ),
      today as (select (now() at time zone 'Asia/Almaty')::date as d)
    select
      (select count(*) from users)::int as total,
      (select count(*) from users where created_at > now() - interval '1 day')::int as new1d,
      (select count(*) from users where created_at > now() - interval '7 days')::int as new7d,
      (select count(*) from users where bot_blocked)::int as blocked,
      (select count(distinct user_id) from r7 where created_at > now() - interval '1 day')::int as active1d,
      (select count(distinct user_id) from r7)::int as active7d,
      (select count(*) from r7 where created_at > now() - interval '1 day')::int as answers1d,
      (select count(*) from r7)::int as answers7d,
      (select coalesce(avg(n), 0) from (select count(distinct day) as n from r7 group by user_id) x)::float as "avgDays7d",
      (select count(*) from user_words where introduced_at > now() - interval '7 days')::int as "newWords7d",
      (select count(*) from users, today where streak_current >= 3 and last_active_day >= today.d - 1)::int as streak3,
      (select count(*) from users, today where streak_current >= 7 and last_active_day >= today.d - 1)::int as streak7,
      (select count(*) from u, today where u.day between today.d - 31 and today.d - 2)::int as "d1Base",
      (select count(*) from u, today where u.day between today.d - 31 and today.d - 2 and exists (
        select 1 from reviews r where r.user_id = u.id
          and (r.created_at at time zone 'Asia/Almaty')::date = u.day + 1))::int as "d1Back",
      (select count(*) from u, today where u.day between today.d - 43 and today.d - 14)::int as "d7Base",
      (select count(*) from u, today where u.day between today.d - 43 and today.d - 14 and exists (
        select 1 from reviews r where r.user_id = u.id
          and (r.created_at at time zone 'Asia/Almaty')::date between u.day + 7 and u.day + 13))::int as "d7Back"
  `);
  const r = res.rows[0];
  const n = (k: keyof UserStats) => Number(r?.[k] ?? 0);
  return {
    total: n('total'),
    new1d: n('new1d'),
    new7d: n('new7d'),
    active1d: n('active1d'),
    active7d: n('active7d'),
    blocked: n('blocked'),
    answers1d: n('answers1d'),
    answers7d: n('answers7d'),
    avgDays7d: n('avgDays7d'),
    newWords7d: n('newWords7d'),
    streak3: n('streak3'),
    streak7: n('streak7'),
    d1Base: n('d1Base'),
    d1Back: n('d1Back'),
    d7Base: n('d7Base'),
    d7Back: n('d7Back'),
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const share = (part: number, base: number) => (base ? `${part} из ${base} (${Math.round((part / base) * 100)}%)` : 'пока не на ком считать');

export function formatStats(s: UserStats): string {
  const perUser7d = s.active7d ? round1(s.answers7d / s.active7d) : 0;
  return [
    'Пользователи',
    `Всего: ${s.total}`,
    `Новых за сутки: ${s.new1d}, за неделю: ${s.new7d}`,
    `Активных за сутки: ${s.active1d}, за неделю: ${s.active7d}`,
    `Заблокировали бота: ${s.blocked}`,
    '',
    'Активность',
    `Ответов за сутки: ${s.answers1d}, за неделю: ${s.answers7d}`,
    `На активного за неделю: ${perUser7d} ответов, ${round1(s.avgDays7d)} дн. из 7`,
    `Новых слов начали учить за неделю: ${s.newWords7d}`,
    `Серия 3+ дня: ${s.streak3}, 7+ дней: ${s.streak7}`,
    '',
    'Возвращаются',
    `На следующий день: ${share(s.d1Back, s.d1Base)}`,
    `Через неделю: ${share(s.d7Back, s.d7Base)}`,
  ].join('\n');
}
