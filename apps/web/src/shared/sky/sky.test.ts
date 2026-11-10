import { describe, expect, it } from 'vitest';
import { skyAt } from './sky';

const at = (h: number, m = 0) => new Date(2026, 10, 10, h, m);

describe('skyAt', () => {
  it('фаза по местному часу', () => {
    expect(skyAt(at(6)).phase).toBe('dawn');
    expect(skyAt(at(13)).phase).toBe('day');
    expect(skyAt(at(19)).phase).toBe('dusk');
    expect(skyAt(at(23)).phase).toBe('night');
    expect(skyAt(at(3)).phase).toBe('night');
  });

  it('солнце в зените в полдень, ночью его нет, а луна есть', () => {
    const noon = skyAt(at(13));
    expect(noon.sun?.y).toBeCloseTo(1);
    expect(noon.moon).toBeNull();
    const night = skyAt(at(1));
    expect(night.sun).toBeNull();
    expect(night.moon).not.toBeNull();
  });

  it('утром солнце слева и низко, вечером справа', () => {
    const morning = skyAt(at(7))!.sun!;
    const evening = skyAt(at(19))!.sun!;
    expect(morning.x).toBeLessThan(0.3);
    expect(evening.x).toBeGreaterThan(0.7);
    expect(morning.y).toBeLessThan(0.5);
  });
});
