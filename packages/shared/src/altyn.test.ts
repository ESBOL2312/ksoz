import { describe, expect, it } from 'vitest';
import { computeReward } from './altyn.js';

describe('altyn', () => {
  it('correct, no combo', () => {
    expect(computeReward('correct', 0, 0)).toEqual({ base: 10, comboBonus: 0, earned: 10, nextCombo: 1 });
  });
  it('combo multiplier caps at 10', () => {
    expect(computeReward('correct', 0, 3).earned).toBe(13);
    expect(computeReward('correct', 0, 25).earned).toBe(20);
  });
  it('hints reduce base by 30% each, floor 0', () => {
    expect(computeReward('correct', 1, 0).base).toBe(7);
    expect(computeReward('correct', 3, 0).base).toBe(1);
    expect(computeReward('correct', 4, 0)).toMatchObject({ base: 0, earned: 0, nextCombo: 1 });
  });
  it('almost halves and keeps combo', () => {
    expect(computeReward('almost', 0, 4)).toEqual({ base: 5, comboBonus: 2, earned: 7, nextCombo: 4 });
  });
  it('wrong resets combo', () => {
    expect(computeReward('wrong', 0, 7)).toEqual({ base: 0, comboBonus: 0, earned: 0, nextCombo: 0 });
  });
});
