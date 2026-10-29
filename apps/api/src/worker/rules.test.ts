import { describe, expect, it } from 'vitest';
import { readNotify } from './notify.js';
import { dueReminders, isQuietHour, pickReminder, type UserSnapshot } from './rules.js';

const TZ = 'Etc/GMT-5'; // UTC+5
/** Местное время UTC+5 → Date. */
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+05:00`);

function user(over: Partial<UserSnapshot> = {}): UserSnapshot {
  return {
    id: 1,
    timezone: TZ,
    notify: {},
    botBlocked: false,
    streakCurrent: 0,
    lastActiveDay: null,
    dueLearning: 0,
    dueTotal: 0,
    lastSent: {},
    lastAnySent: null,
    ...over,
  };
}
const kinds = (now: Date, u: UserSnapshot) => dueReminders(now, u).map((d) => d.kind);

describe('readNotify', () => {
  it('defaults when missing or malformed', () => {
    expect(readNotify(null)).toEqual({ short: true, daily: true, streak: true, baige: true });
    expect(readNotify({ short: false, daily: 'no' })).toEqual({ short: false, daily: true, streak: true, baige: true });
  });
});

describe('quiet hours', () => {
  it('22:00-09:00 local', () => {
    expect(isQuietHour(at('2026-10-29', '21:59'), TZ)).toBe(false);
    expect(isQuietHour(at('2026-10-29', '22:00'), TZ)).toBe(true);
    expect(isQuietHour(at('2026-10-29', '03:00'), TZ)).toBe(true);
    expect(isQuietHour(at('2026-10-29', '08:59'), TZ)).toBe(true);
    expect(isQuietHour(at('2026-10-29', '09:00'), TZ)).toBe(false);
  });
  it('is evaluated in the user timezone', () => {
    const now = new Date('2026-10-29T05:00:00Z'); // 10:00 в UTC+5, 00:00 в UTC-5
    expect(isQuietHour(now, 'Etc/GMT-5')).toBe(false);
    expect(isQuietHour(now, 'Etc/GMT+5')).toBe(true);
  });
  it('short review is not sent in quiet hours, sent right after', () => {
    const u = user({ dueLearning: 2 });
    expect(kinds(at('2026-10-29', '08:59'), u)).toEqual([]);
    expect(kinds(at('2026-10-29', '09:00'), u)).toEqual(['short']);
    expect(kinds(at('2026-10-29', '21:59'), u)).toEqual(['short']);
    expect(kinds(at('2026-10-29', '22:00'), u)).toEqual([]);
  });
});

describe('short review', () => {
  it('needs due learning words and the flag', () => {
    const now = at('2026-10-29', '14:00');
    expect(kinds(now, user({ dueLearning: 0, dueTotal: 3 }))).toEqual([]);
    expect(kinds(now, user({ dueLearning: 1, notify: { short: false } }))).toEqual([]);
  });
  it('at most once per hour', () => {
    const now = at('2026-10-29', '14:00');
    const u = (mins: number) => user({ dueLearning: 1, lastSent: { short: new Date(now.getTime() - mins * 60_000) } });
    expect(kinds(now, u(59))).toEqual([]);
    expect(kinds(now, u(60))).toEqual(['short']);
  });
  it('not right after another notification of any kind', () => {
    const now = at('2026-10-29', '14:00');
    expect(kinds(now, user({ dueLearning: 1, lastAnySent: new Date(now.getTime() - 10 * 60_000) }))).toEqual([]);
  });
});

describe('daily', () => {
  it('only 9:00-10:00 local, once per local day', () => {
    const u = user({ dueTotal: 5 });
    expect(kinds(at('2026-10-29', '08:59'), u)).toEqual([]);
    expect(kinds(at('2026-10-29', '09:00'), u)).toEqual(['daily']);
    expect(kinds(at('2026-10-29', '09:59'), u)).toEqual(['daily']);
    expect(kinds(at('2026-10-29', '10:00'), u)).toEqual([]);
    const sent = user({ dueTotal: 5, lastSent: { daily: at('2026-10-29', '09:00') } });
    expect(kinds(at('2026-10-29', '09:30'), sent)).toEqual([]);
    const yest = user({ dueTotal: 5, lastSent: { daily: at('2026-10-28', '09:00') } });
    expect(kinds(at('2026-10-29', '09:30'), yest)).toEqual(['daily']);
  });
  it('requires due words and flag', () => {
    expect(kinds(at('2026-10-29', '09:10'), user())).toEqual([]);
    expect(kinds(at('2026-10-29', '09:10'), user({ dueTotal: 1, notify: { daily: false } }))).toEqual([]);
  });
  it('daily wins over short in the same scan', () => {
    const u = user({ dueTotal: 4, dueLearning: 2 });
    expect(pickReminder(at('2026-10-29', '09:05'), u)?.kind).toBe('daily');
  });
});

describe('streak at risk', () => {
  const base = { streakCurrent: 5, lastActiveDay: '2026-10-28' };
  it('20:00-21:00 local when not active today', () => {
    expect(kinds(at('2026-10-29', '19:59'), user(base))).toEqual([]);
    expect(kinds(at('2026-10-29', '20:00'), user(base))).toEqual(['streak']);
    expect(kinds(at('2026-10-29', '21:00'), user(base))).toEqual([]);
  });
  it('not if active today, streak 0, flag off or already sent today', () => {
    const now = at('2026-10-29', '20:05');
    expect(kinds(now, user({ ...base, lastActiveDay: '2026-10-29' }))).toEqual([]);
    expect(kinds(now, user({ ...base, streakCurrent: 0 }))).toEqual([]);
    expect(kinds(now, user({ ...base, notify: { streak: false } }))).toEqual([]);
    expect(kinds(now, user({ ...base, lastSent: { streak: at('2026-10-29', '20:00') } }))).toEqual([]);
  });
  it('timezone boundary: "today" is the local day', () => {
    // 2026-10-29 20:30 в UTC+5 = 15:30Z; у UTC-5 это 10:30 — не время
    const now = new Date('2026-10-29T15:30:00Z');
    const u = { ...base, lastActiveDay: '2026-10-28' };
    expect(kinds(now, user({ ...u, timezone: 'Etc/GMT-5' }))).toEqual(['streak']);
    expect(kinds(now, user({ ...u, timezone: 'Etc/GMT+5' }))).toEqual([]);
    // последняя активность «сегодня» по местному, но вчера по UTC
    const lateNow = new Date('2026-10-29T15:30:00Z');
    expect(kinds(lateNow, user({ ...u, lastActiveDay: '2026-10-29' }))).toEqual([]);
  });
  it('local day of a previous send is evaluated in user tz', () => {
    // 20:30 UTC+5 вчера = 15:30Z; сегодня 20:10 UTC+5 → другой местный день
    const u = user({ ...base, lastSent: { streak: new Date('2026-10-28T15:30:00Z') } });
    expect(kinds(at('2026-10-29', '20:10'), u)).toEqual(['streak']);
  });
});

describe('baige', () => {
  const sunday = at('2026-11-01', '21:10');
  const res = { score: 120, rank: 3, total: 40 };
  it('Sunday 21:00-22:00 local with a result', () => {
    expect(kinds(sunday, user({ baige: res }))).toEqual(['baige']);
    expect(kinds(at('2026-11-01', '20:59'), user({ baige: res }))).toEqual([]);
    expect(kinds(at('2026-10-31', '21:10'), user({ baige: res }))).toEqual([]); // суббота
    expect(kinds(sunday, user({ baige: null }))).toEqual([]);
    expect(kinds(sunday, user({ baige: res, notify: { baige: false } }))).toEqual([]);
  });
  it('once per week', () => {
    const u = user({ baige: res, lastSent: { baige: at('2026-11-01', '21:00') } });
    expect(kinds(at('2026-11-01', '21:30'), u)).toEqual([]);
    const prev = user({ baige: res, lastSent: { baige: at('2026-10-25', '21:00') } });
    expect(kinds(sunday, prev)).toEqual(['baige']);
  });
});

describe('blocked users', () => {
  it('get nothing', () => {
    expect(kinds(at('2026-10-29', '09:10'), user({ botBlocked: true, dueTotal: 3, dueLearning: 3 }))).toEqual([]);
  });
});
