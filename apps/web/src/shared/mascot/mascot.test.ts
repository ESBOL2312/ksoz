import { describe, expect, it } from 'vitest';
import { artForItem } from '@/shared/art/art';
import { sceneFrom, wearFrom } from './mascot';

describe('mascot', () => {
  it('надевает вещи по слоту', () => {
    expect(wearFrom([{ slot: 'head' }, { slot: 'feet' }])).toEqual({ hat: true, coat: false, boots: true });
    expect(wearFrom(undefined)).toEqual({ hat: false, coat: false, boots: false });
  });

  it('расставляет аул по словам вещей', () => {
    const s = sceneFrom([{ kk: 'Жылқы' }, { kk: 'Мысық' }, { kk: 'Шай' }]);
    expect(s).toMatchObject({ horse: true, cat: true, tea: true, sheep: false, house: false });
  });

  it('у каждого товара базара своя картинка', () => {
    expect(artForItem('Тақия', 'kiim')).toBe('takiya');
    expect(artForItem('Етік', 'kiim')).toBe('etik');
    expect(artForItem('Мысық', 'mal')).toBe('cat');
    expect(artForItem('Қой', 'mal')).toBe('sheep');
    expect(artForItem('Шай', 'aspap')).toBe('tea');
  });
});
