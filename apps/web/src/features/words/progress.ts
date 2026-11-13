import { LEARNING_STEPS_MS, MASTERED_INTERVAL_DAYS, type MyWord } from '@ksoz/shared';
import { days } from '@/shared/format';

/** Сколько ступеней коротких повторов (20 мин, 1 ч, 2 ч, 5 ч). */
export const SHORT_STEPS = LEARNING_STEPS_MS.length;

type Progress = Pick<MyWord, 'phase' | 'step' | 'interval_days'>;

/**
 * Заполненность пяти делений лесенки (0..1): четыре коротких повтора
 * и пятое — долгие повторы, которое растёт с интервалом до 21 дня.
 */
export function ladder(w: Progress): number[] {
  if (w.phase === 'learning') return Array.from({ length: SHORT_STEPS + 1 }, (_, i) => (i < w.step ? 1 : 0));
  const long = Math.min(1, w.interval_days / MASTERED_INTERVAL_DAYS);
  return [...Array<number>(SHORT_STEPS).fill(1), long];
}

/** Общий прогресс слова до «выучено», 0..100. */
export function percent(w: Progress): number {
  const parts = ladder(w);
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

/** Подпись этапа: «Короткие повторы: 1 из 4» или «Интервал 6 дней из 21». */
export function stageText(w: Progress): string {
  if (w.phase === 'learning') return `Короткие повторы: ${w.step} из ${SHORT_STEPS}`;
  return `Интервал ${days(w.interval_days)} из ${MASTERED_INTERVAL_DAYS}`;
}

/** Доля верных ответов («почти» считается наполовину); null — ответов ещё не было. */
export function accuracy(a: MyWord['answers']): number | null {
  const n = a.correct + a.almost + a.wrong;
  return n ? Math.round(((a.correct + a.almost / 2) / n) * 100) : null;
}
