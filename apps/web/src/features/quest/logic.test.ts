import { describe, expect, it } from 'vitest';
import { answerInText, buildChoiceTasks, fillGap, gapStartsSentence, pickOptions, retryTask, splitGap } from './logic';

describe('gap insertion', () => {
  it('keeps the capital letter at the start of a sentence', () => {
    expect(fillGap('___, Асан!', 'Сәлем')).toBe('Сәлем, Асан!');
    expect(fillGap('___!', 'Сәлеметсіз бе')).toBe('Сәлеметсіз бе!');
    expect(fillGap('— Қалың қалай? — ___, рақмет.', 'Жақсы')).toBe('— Қалың қалай? — Жақсы, рақмет.');
    expect(fillGap('Сәлеметсіз бе! ___', 'Қалыңыз қалай?')).toBe('Сәлеметсіз бе! Қалыңыз қалай?');
    expect(fillGap('Жақсы, рақмет. ___', 'Өзің ше?')).toBe('Жақсы, рақмет. Өзің ше?');
  });

  it('lowercases the answer in the middle of a sentence', () => {
    expect(fillGap('Асан, ___', 'Жасың нешеде?')).toBe('Асан, жасың нешеде?');
    expect(fillGap('Кешіріңіз, ___.', 'Түсінбедім')).toBe('Кешіріңіз, түсінбедім.');
    expect(fillGap('Жақсы, ___!', 'Кездескенше')).toBe('Жақсы, кездескенше!');
    expect(answerInText('Ағам ___ жаста.', 'Отыз')).toBe('отыз');
  });

  it('glues a suffix written right after the gap', () => {
    expect(fillGap('Мен ___дан келдім.', 'Ауыл')).toBe('Мен ауылдан келдім.');
    expect(fillGap('Бұл менің ___ім.', 'Үй')).toBe('Бұл менің үйім.');
    expect(fillGap('Мен ___мін, мектепте жұмыс істеймін.', 'Мұғалім')).toBe('Мен мұғаліммін, мектепте жұмыс істеймін.');
  });

  it('splits around the first gap and leaves text without a gap as is', () => {
    expect(splitGap('Мен ___дан.')).toEqual({ before: 'Мен ', after: 'дан.' });
    expect(splitGap('Сәлем')).toBeNull();
    expect(fillGap('Сәлем', 'x')).toBe('Сәлем');
    expect(gapStartsSentence('')).toBe(true);
    expect(gapStartsSentence('— ')).toBe(true);
    expect(gapStartsSentence('Айгүл, сен ')).toBe(false);
  });
});

const items = [
  { word_id: 1, kk: 'Сәлем', ru: 'привет' },
  { word_id: 2, kk: 'Сәлеметсіз бе', ru: 'здравствуйте' },
  { word_id: 3, kk: 'Қайырлы таң', ru: 'доброе утро' },
];
const distractors = [
  { kk: 'Рақмет', ru: 'спасибо' },
  { kk: 'Жақсы', ru: 'хорошо' },
  { kk: 'сәлем', ru: 'Привет' }, // дубль с другим регистром не должен стать вторым верным
];

describe('choice tasks', () => {
  it('builds two tasks per item: kk→ru in order, then ru→kk', () => {
    const tasks = buildChoiceTasks(items, distractors);
    expect(tasks).toHaveLength(6);
    expect(tasks.slice(0, 3).map((t) => [t.dir, t.prompt, t.answer])).toEqual([
      ['kk-ru', 'Сәлем', 'привет'],
      ['kk-ru', 'Сәлеметсіз бе', 'здравствуйте'],
      ['kk-ru', 'Қайырлы таң', 'доброе утро'],
    ]);
    expect(tasks.slice(3).every((t) => t.dir === 'ru-kk')).toBe(true);
    expect(tasks.slice(3).map((t) => t.word_id).sort()).toEqual([1, 2, 3]);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(6);
  });

  it('gives 4 distinct options with exactly one right answer', () => {
    for (const t of buildChoiceTasks(items, distractors)) {
      expect(t.options).toHaveLength(4);
      const low = t.options.map((o) => o.toLocaleLowerCase('kk'));
      expect(new Set(low).size).toBe(4);
      expect(low.filter((o) => o === t.answer.toLocaleLowerCase('kk'))).toHaveLength(1);
      expect(t.options).toContain(t.answer);
      if (t.dir === 'ru-kk') expect(t.options.every((o) => [...items, ...distractors].some((p) => p.kk === o))).toBe(true);
    }
  });

  it('uses fewer options when the pool is small', () => {
    expect(pickOptions('a', ['a', 'b'])).toHaveLength(2);
    const [t] = buildChoiceTasks([items[0]!], []);
    expect(t!.options).toEqual(['привет']);
  });

  it('a retried task gets a new id and the same options', () => {
    const [t] = buildChoiceTasks(items, distractors);
    const r = retryTask(t!, 1);
    expect(r.id).toBe(`${t!.id}#1`);
    expect(retryTask(r, 2).id).toBe(`${t!.id}#2`);
    expect([...r.options].sort()).toEqual([...t!.options].sort());
  });
});

describe('quest trail', () => {
  it('zigzags the stops and draws one curve between each pair', async () => {
    const { trailPath, trailPoints, TRAIL_ROW } = await import('./logic');
    const pts = trailPoints(3);
    expect(pts.map((p) => p.x)).toEqual([30, 70, 30]);
    expect(pts[1]!.y - pts[0]!.y).toBe(TRAIL_ROW);
    const d = trailPath(pts);
    expect(d.startsWith(`M30 ${pts[0]!.y}`)).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(trailPath([])).toBe('');
  });
});
