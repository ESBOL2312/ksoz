import { DEFAULT_NOTIFY, type Me } from '@ksoz/shared';
import type { Config } from '../config.js';
import type { UserRow } from '../db/schema.js';

export function serializeMe(u: UserRow, config: Config): Me {
  return {
    id: u.id,
    first_name: u.firstName,
    username: u.username,
    level: u.level,
    city_id: u.cityId,
    timezone: u.timezone,
    altyn: u.altyn,
    combo: u.combo,
    streak_current: u.streakCurrent,
    streak_best: u.streakBest,
    aul_stage: u.aulStage,
    notify: { ...DEFAULT_NOTIFY, ...u.notify },
    is_admin: config.ADMIN_IDS.includes(u.id),
    created_at: u.createdAt.toISOString(),
  };
}
