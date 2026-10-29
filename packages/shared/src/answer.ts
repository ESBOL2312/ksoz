import type { Verdict } from './srs.js';

export interface Fix {
  pos: number;
  expected: string;
}

export interface AnswerCheck {
  verdict: Verdict;
  fix: Fix[];
}

const RU_PROJECTION: Record<string, string> = {
  ә: 'а', ғ: 'г', қ: 'к', ң: 'н', ө: 'о', ұ: 'у', ү: 'у', і: 'и', һ: 'х',
};

export function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** «Русская проекция»: казахские буквы заменяются русскими аналогами (длина строки сохраняется). */
export function project(s: string): string {
  let out = '';
  for (const ch of s) out += RU_PROJECTION[ch] ?? ch;
  return out;
}

export function checkAnswer(input: string, expected: string): AnswerCheck {
  const a = normalize(input);
  const e = normalize(expected);
  if (a === e) return { verdict: 'correct', fix: [] };
  if (project(a) !== project(e)) return { verdict: 'wrong', fix: [] };

  const ac = [...a];
  const ec = [...e];
  const fix: Fix[] = [];
  ec.forEach((ch, pos) => {
    if (ac[pos] !== ch) fix.push({ pos, expected: ch });
  });
  return { verdict: 'almost', fix };
}

/** Открытая часть слова после очередной подсказки: hintsUsed уже использовано, берём ещё одну букву. */
export function nextHint(expected: string, hintsUsed: number): string {
  return [...normalize(expected)].slice(0, hintsUsed + 1).join('');
}
