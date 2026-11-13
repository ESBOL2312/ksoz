import { describe, expect, it } from 'vitest';
import { initialState, knownState, previewNext, quality, schedule, KNOWN_INTERVAL_DAYS, LEARNING_STEPS_MS, MASTERED_INTERVAL_DAYS, wordGroup } from './srs.js';

const now = new Date('2026-10-29T10:00:00Z');
const MIN = 60_000;

describe('srs', () => {
  it('quality', () => {
    expect(quality('correct', 0)).toBe(4);
    expect(quality('correct', 2)).toBe(3);
    expect(quality('almost', 0)).toBe(3);
    expect(quality('wrong', 0)).toBe(0);
  });

  it('new word is due in 20 minutes', () => {
    expect(initialState(now).dueAt.getTime() - now.getTime()).toBe(20 * MIN);
  });

  it('known word goes straight to review and comes back in a month', () => {
    const s = knownState(now);
    expect(s.phase).toBe('review');
    expect(s.intervalDays).toBe(KNOWN_INTERVAL_DAYS);
    expect(s.dueAt.getTime() - now.getTime()).toBe(KNOWN_INTERVAL_DAYS * 24 * 60 * MIN);
    // ошибка на проверке возвращает слово в обучение
    expect(schedule(s, 'wrong', now)).toMatchObject({ phase: 'learning', step: 0, lapses: 1 });
  });

  it('walks through learning steps then enters review with 1 day', () => {
    let s = initialState(now);
    const delays: number[] = [];
    for (let i = 0; i < 3; i++) {
      s = schedule(s, 'correct', now);
      expect(s.phase).toBe('learning');
      delays.push(s.dueAt.getTime() - now.getTime());
    }
    expect(delays).toEqual([...LEARNING_STEPS_MS.slice(1)]);
    s = schedule(s, 'correct', now);
    expect(s.phase).toBe('review');
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt.getTime() - now.getTime()).toBe(86_400_000);
  });

  it('wrong in learning goes to step 0', () => {
    let s = schedule(schedule(initialState(now), 'correct', now), 'correct', now);
    expect(s.step).toBe(2);
    s = schedule(s, 'wrong', now);
    expect(s.step).toBe(0);
    expect(s.dueAt.getTime() - now.getTime()).toBe(20 * MIN);
    expect(s.lapses).toBe(0);
  });

  it('review uses interval*ease and updates ease', () => {
    const s = { ...initialState(now), phase: 'review' as const, intervalDays: 6, ease: 2.5 };
    const n = schedule(s, 'correct', now);
    expect(n.intervalDays).toBe(15);
    expect(n.ease).toBeCloseTo(2.5, 5); // q=4 даёт 0 изменения
    const h = schedule(s, 'correct', now, 1); // q=3
    expect(h.ease).toBeCloseTo(2.5 + 0.1 - 2 * (0.08 + 0.04), 5);
  });

  it('wrong in review: lapse, ease-0.2, back to learning', () => {
    const s = { ...initialState(now), phase: 'review' as const, intervalDays: 6, ease: 1.4, reps: 5 };
    const n = schedule(s, 'wrong', now);
    expect(n).toMatchObject({ phase: 'learning', step: 0, lapses: 1 });
    expect(n.ease).toBe(1.3);
  });

  it('previewNext matches schedule', () => {
    const s = initialState(now);
    const p = previewNext(s, 'correct', now);
    expect(p.next).toEqual(schedule(s, 'correct', now));
    expect(p.inMs).toBe(60 * MIN);
  });
});

describe('wordGroup', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const later = new Date(now.getTime() + 3_600_000);
  it('splits words into due / learning / review / mastered', () => {
    expect(wordGroup({ phase: 'learning', intervalDays: 0, dueAt: now }, now)).toBe('due');
    expect(wordGroup({ phase: 'learning', intervalDays: 0, dueAt: later }, now)).toBe('learning');
    expect(wordGroup({ phase: 'review', intervalDays: 20, dueAt: later }, now)).toBe('review');
    expect(wordGroup({ phase: 'review', intervalDays: 20, dueAt: now }, now)).toBe('due');
    expect(wordGroup({ phase: 'review', intervalDays: MASTERED_INTERVAL_DAYS, dueAt: now }, now)).toBe('mastered');
  });
});
