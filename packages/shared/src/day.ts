export const DEFAULT_TIMEZONE = 'Asia/Almaty';

function parts(now: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Календарный день пользователя: 'YYYY-MM-DD'. */
export function localDay(now: Date, timeZone: string): string {
  const p = parts(now, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Местное время: часы и минуты (для тихих часов и утренних напоминаний). */
export function localTime(now: Date, timeZone: string): { hour: number; minute: number } {
  const { hour, minute } = parts(now, timeZone);
  return { hour, minute };
}

/** Сдвиг дня 'YYYY-MM-DD' на n дней. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO-неделя по местному дню: 'YYYY-Www' (неделя начинается в понедельник). */
export function isoWeek(now: Date, timeZone: string): string {
  const d = new Date(`${localDay(now, timeZone)}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow); // четверг этой недели
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${pad(week)}`;
}
