import { describe, expect, it } from 'vitest';
import { inTime, num, plural } from './format';

describe('format', () => {
  it('plural', () => {
    const f = ['слово', 'слова', 'слов'] as const;
    expect([1, 2, 5, 11, 21, 22, 112].map((n) => plural(n, f))).toEqual([
      'слово', 'слова', 'слов', 'слов', 'слово', 'слова', 'слов',
    ]);
  });
  it('num uses narrow spaces', () => expect(num(2480)).toBe('2 480'));
  it('inTime', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(inTime('2026-01-01T00:20:00Z', now)).toBe('через 20 мин');
    expect(inTime('2026-01-01T02:00:00Z', now)).toBe('через 2 ч');
    expect(inTime('2026-01-04T00:00:00Z', now)).toBe('через 3 дня');
    expect(inTime('2025-12-31T00:00:00Z', now)).toBe('сейчас');
  });
});
