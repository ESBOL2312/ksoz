import { describe, expect, it } from 'vitest';
import { checkAnswer, nextHint, normalize } from './answer.js';

describe('answer', () => {
  it('normalizes', () => {
    expect(normalize('  БҮРКІТ   Көк ')).toBe('бүркіт көк');
    expect(normalize('ӑ')).toBe('ӑ'); // NFC
  });

  it('correct', () => {
    expect(checkAnswer(' Бүркіт ', 'бүркіт')).toEqual({ verdict: 'correct', fix: [] });
  });

  it('almost with fix positions', () => {
    expect(checkAnswer('буркіт', 'бүркіт')).toEqual({
      verdict: 'almost',
      fix: [{ pos: 1, expected: 'ү' }],
    });
    const r = checkAnswer('кала', 'қала');
    expect(r.verdict).toBe('almost');
    expect(r.fix).toEqual([{ pos: 0, expected: 'қ' }]);
    expect(checkAnswer('салем', 'сәлем').fix).toEqual([{ pos: 1, expected: 'ә' }]);
  });

  it('wrong', () => {
    expect(checkAnswer('алма', 'нан')).toEqual({ verdict: 'wrong', fix: [] });
    expect(checkAnswer('', 'нан').verdict).toBe('wrong');
  });

  it('hints reveal prefix', () => {
    expect(nextHint('Бүркіт', 0)).toBe('б');
    expect(nextHint('Бүркіт', 2)).toBe('бүр');
    expect(nextHint('ай', 5)).toBe('ай');
  });
});
