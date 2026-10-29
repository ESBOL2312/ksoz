import type { Verdict } from './srs.js';

export const ALTYN = {
  BASE: 10,
  COMBO_STEP: 0.1,
  COMBO_CAP: 10,
  HINT_PENALTY: 0.3,
  ALMOST_FACTOR: 0.5,
  NEW_PER_DAY: 10,
} as const;

export interface Reward {
  base: number;
  comboBonus: number;
  earned: number;
  nextCombo: number;
}

export function comboMultiplier(combo: number): number {
  return 1 + ALTYN.COMBO_STEP * Math.min(combo, ALTYN.COMBO_CAP);
}

/** `combo` — серия верных ответов до этого ответа. */
export function computeReward(verdict: Verdict, hints: number, combo: number): Reward {
  if (verdict === 'wrong') return { base: 0, comboBonus: 0, earned: 0, nextCombo: 0 };

  let base = ALTYN.BASE * Math.max(0, 1 - ALTYN.HINT_PENALTY * hints);
  if (verdict === 'almost') base *= ALTYN.ALMOST_FACTOR;
  base = Math.round(base);

  const earned = Math.round(base * comboMultiplier(combo));
  return {
    base,
    comboBonus: earned - base,
    earned,
    nextCombo: verdict === 'almost' ? combo : combo + 1,
  };
}
