import { describe, expect, it } from 'vitest';
import { addDays, isoWeek, isValidTimezone, localDay, localTime } from './day.js';

describe('day', () => {
  it('localDay respects timezone', () => {
    const t = new Date('2026-10-29T20:30:00Z');
    expect(localDay(t, 'UTC')).toBe('2026-10-29');
    expect(localDay(t, 'Asia/Almaty')).toBe('2026-10-30'); // UTC+5
    expect(localDay(t, 'America/New_York')).toBe('2026-10-29');
  });
  it('localTime', () => {
    expect(localTime(new Date('2026-10-29T20:30:00Z'), 'Asia/Almaty')).toEqual({ hour: 1, minute: 30 });
    expect(localTime(new Date('2026-10-29T00:05:00Z'), 'UTC').hour).toBe(0);
  });
  it('addDays', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('isoWeek', () => {
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'), 'UTC')).toBe('2026-W01');
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'), 'UTC')).toBe('2026-W53');
    expect(isoWeek(new Date('2026-10-26T00:00:00Z'), 'UTC')).toBe('2026-W44');
    // воскресенье по UTC уже понедельник в Алматы
    expect(isoWeek(new Date('2026-11-01T20:00:00Z'), 'Asia/Almaty')).toBe('2026-W45');
    expect(isoWeek(new Date('2026-11-01T20:00:00Z'), 'UTC')).toBe('2026-W44');
  });
  it('isValidTimezone', () => {
    expect(isValidTimezone('Asia/Almaty')).toBe(true);
    expect(isValidTimezone('Mars/Base')).toBe(false);
  });
});
