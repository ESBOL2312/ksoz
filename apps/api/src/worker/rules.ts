import { addDays, isoWeek, localDay, localTime } from '@ksoz/shared';
import { readNotify } from './notify.js';

export type ReminderKind = 'short' | 'daily' | 'streak' | 'baige';

/** Порядок важности: за один проход пользователю уходит не больше одного сообщения. */
export const KIND_PRIORITY: readonly ReminderKind[] = ['streak', 'daily', 'baige', 'short'];

/** Тихие часы: с 22:00 до 9:00 местного времени. */
export const QUIET_FROM = 22;
export const QUIET_TO = 9;
export const DAILY_HOUR = 9; // 9:00–10:00 местного
export const STREAK_HOUR = 20; // 20:00–21:00 местного
export const BAIGE_HOUR = 21; // воскресенье 21:00–22:00 местного: неделя закрыта, итоги отправляем
export const SHORT_MIN_GAP_MS = 60 * 60 * 1000;

export interface BaigeResult {
  score: number;
  rank: number;
  total: number;
}

export interface UserSnapshot {
  id: number;
  timezone: string;
  notify: unknown;
  botBlocked: boolean;
  streakCurrent: number;
  lastActiveDay: string | null;
  /** слов в фазе learning с наступившим due_at */
  dueLearning: number;
  /** всех слов с наступившим due_at */
  dueTotal: number;
  /** когда в последний раз отправляли напоминание каждого вида */
  lastSent: Partial<Record<ReminderKind, Date>>;
  /** последнее напоминание любого вида */
  lastAnySent: Date | null;
  /** итог недели (заполняется только в окне бәйге) */
  baige?: BaigeResult | null;
}

export interface DueReminder {
  kind: ReminderKind;
  /** ключ периода: вместе с пользователем и видом даёт идентификатор «не слать дважды» */
  period: string;
}

export function isQuietHour(now: Date, timeZone: string): boolean {
  const { hour } = localTime(now, timeZone);
  return hour >= QUIET_FROM || hour < QUIET_TO;
}

/** Воскресенье по местному дню (ISO: 7). */
export function isLocalSunday(now: Date, timeZone: string): boolean {
  return new Date(`${localDay(now, timeZone)}T00:00:00Z`).getUTCDay() === 0;
}

/** Попадает ли момент в окно итогов бәйге (воскресенье, BAIGE_HOUR). */
export function isBaigeWindow(now: Date, timeZone: string): boolean {
  return isLocalSunday(now, timeZone) && localTime(now, timeZone).hour === BAIGE_HOUR;
}

export function periodKey(kind: ReminderKind, now: Date, timeZone: string): string {
  switch (kind) {
    case 'short':
      return `h${Math.floor(now.getTime() / SHORT_MIN_GAP_MS)}`;
    case 'baige':
      return isoWeek(now, timeZone);
    default:
      return localDay(now, timeZone);
  }
}

function sentToday(last: Date | undefined, now: Date, tz: string): boolean {
  return last !== undefined && localDay(last, tz) === localDay(now, tz);
}

/** Все напоминания, которые сейчас положено отправить пользователю, по убыванию приоритета. */
export function dueReminders(now: Date, u: UserSnapshot): DueReminder[] {
  if (u.botBlocked) return [];
  const tz = u.timezone;
  const notify = readNotify(u.notify);
  const { hour } = localTime(now, tz);
  if (isQuietHour(now, tz)) return [];
  const today = localDay(now, tz);
  const out: DueReminder[] = [];
  const add = (kind: ReminderKind) => out.push({ kind, period: periodKey(kind, now, tz) });

  if (
    notify.streak &&
    hour === STREAK_HOUR &&
    u.streakCurrent > 0 &&
    u.lastActiveDay !== today &&
    !sentToday(u.lastSent.streak, now, tz)
  ) {
    add('streak');
  }
  if (notify.daily && hour === DAILY_HOUR && u.dueTotal > 0 && !sentToday(u.lastSent.daily, now, tz)) {
    add('daily');
  }
  if (
    notify.baige &&
    isBaigeWindow(now, tz) &&
    u.baige &&
    u.baige.score > 0 &&
    !(u.lastSent.baige && isoWeek(u.lastSent.baige, tz) === isoWeek(now, tz))
  ) {
    add('baige');
  }
  if (
    notify.short &&
    u.dueLearning > 0 &&
    (!u.lastSent.short || now.getTime() - u.lastSent.short.getTime() >= SHORT_MIN_GAP_MS) &&
    (!u.lastAnySent || now.getTime() - u.lastAnySent.getTime() >= SHORT_MIN_GAP_MS)
  ) {
    add('short');
  }
  return out;
}

/** Самое важное из положенного (одно сообщение за проход) или null. */
export function pickReminder(now: Date, u: UserSnapshot): DueReminder | null {
  const due = dueReminders(now, u);
  for (const kind of KIND_PRIORITY) {
    const hit = due.find((d) => d.kind === kind);
    if (hit) return hit;
  }
  return null;
}

/** Вчерашний день пользователя (для справки/тестов). */
export function yesterday(now: Date, tz: string): string {
  return addDays(localDay(now, tz), -1);
}
