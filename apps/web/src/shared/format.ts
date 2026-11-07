const nf = new Intl.NumberFormat('ru-RU');

/** 2480 → «2 480» */
export const num = (n: number): string => nf.format(n).replace(/ /g, ' ');

/** Русское склонение: plural(5, ['слово', 'слова', 'слов']) → «слов» */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const words = (n: number) => `${n} ${plural(n, ['слово', 'слова', 'слов'])}`;
export const days = (n: number) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

/** Через сколько: «через 20 мин», «через 2 ч», «через 3 дня». Прошедшее время → «сейчас». */
export function inTime(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 60_000) return 'сейчас';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `через ${min} мин`;
  const h = Math.round(min / 60);
  if (h < 24) return `через ${h} ч`;
  const d = Math.round(h / 24);
  return `через ${days(d)}`;
}

/** Подписи шагов коротких повторов (learning, шаги 0–3) и дальше SRS. */
export const STEP_LABELS = ['20 мин', '1 ч', '2 ч', '5 ч', 'SRS'] as const;

/** Ступени аула: индекс = aul_stage (0–6). */
export const AUL_STAGES = [
  'Бос дала',
  'Жалғыз үй',
  'Шағын ауыл',
  'Ауыл',
  'Үлкен ауыл',
  'Қала',
  'Орда',
] as const;

/** Подписи заданий дня (коды с бэкенда: services/tasks.ts). */
export const TASK_TITLES: Record<string, { title: string; hint: string }> = {
  review_20: { title: 'Ответить на 20 карточек', hint: 'Любые повторы' },
  learn_5: { title: 'Выучить 5 новых слов', hint: 'Новые слова в уроке' },
  streak_5: { title: '5 верных ответов подряд', hint: 'Без ошибок' },
};

export const CATEGORY_LABELS = { kiim: 'Киім', uy: 'Үй', mal: 'Мал', aspap: 'Аспап' } as const;
