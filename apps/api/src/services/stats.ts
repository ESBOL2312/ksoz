import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';

export interface UserStats {
  total: number;
  new1d: number;
  new7d: number;
  active1d: number;
  active7d: number;
  blocked: number;
}

/** Сводка по пользователям для команды /stats. Активный — ответил хотя бы на одно слово. */
export async function userStats(db: Db): Promise<UserStats> {
  const res = await db.execute<Record<keyof UserStats, number>>(sql`
    select
      (select count(*) from users)::int as total,
      (select count(*) from users where created_at > now() - interval '1 day')::int as new1d,
      (select count(*) from users where created_at > now() - interval '7 days')::int as new7d,
      (select count(*) from users where bot_blocked)::int as blocked,
      (select count(distinct user_id) from reviews where created_at > now() - interval '1 day')::int as active1d,
      (select count(distinct user_id) from reviews where created_at > now() - interval '7 days')::int as active7d
  `);
  const r = res.rows[0];
  return {
    total: r?.total ?? 0,
    new1d: r?.new1d ?? 0,
    new7d: r?.new7d ?? 0,
    active1d: r?.active1d ?? 0,
    active7d: r?.active7d ?? 0,
    blocked: r?.blocked ?? 0,
  };
}

export function formatStats(s: UserStats): string {
  return [
    'Пользователи',
    `Всего: ${s.total}`,
    `Новых за сутки: ${s.new1d}, за неделю: ${s.new7d}`,
    `Активных за сутки: ${s.active1d}, за неделю: ${s.active7d}`,
    `Заблокировали бота: ${s.blocked}`,
  ].join('\n');
}
