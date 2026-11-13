import { describe, expect, it } from 'vitest';
import { accuracy, ladder, percent, stageText } from './progress';

describe('word progress', () => {
  it('fills short steps that are passed', () => {
    expect(ladder({ phase: 'learning', step: 0, interval_days: 0 })).toEqual([0, 0, 0, 0, 0]);
    expect(ladder({ phase: 'learning', step: 2, interval_days: 0 })).toEqual([1, 1, 0, 0, 0]);
    expect(stageText({ phase: 'learning', step: 2, interval_days: 0 })).toBe('Короткие повторы: 2 из 4');
  });

  it('grows the last step with the review interval up to 21 days', () => {
    const w = { phase: 'review' as const, step: 0, interval_days: 7 };
    expect(ladder(w)).toEqual([1, 1, 1, 1, 1 / 3]);
    expect(percent(w)).toBe(87);
    expect(stageText(w)).toBe('Интервал 7 дней из 21');
    expect(percent({ ...w, interval_days: 40 })).toBe(100);
  });

  it('computes accuracy with «почти» as half', () => {
    expect(accuracy({ correct: 0, almost: 0, wrong: 0 })).toBeNull();
    expect(accuracy({ correct: 2, almost: 1, wrong: 1 })).toBe(63);
  });
});
