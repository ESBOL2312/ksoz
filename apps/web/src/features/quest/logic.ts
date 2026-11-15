import type { QuestItem } from '@ksoz/shared';

/** Место пропуска в предложениях «В жизни». */
export const GAP = '___';

export function shuffle<T>(list: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Делит текст по первому ___: до и после пропуска. Без пропуска — null. */
export function splitGap(text: string): { before: string; after: string } | null {
  const i = text.indexOf(GAP);
  if (i < 0) return null;
  return { before: text.slice(0, i), after: text.slice(i + GAP.length) };
}

/**
 * Пропуск стоит в начале предложения: в самом начале текста, после «— »
 * (реплика в диалоге) или после конца предыдущего предложения («Сәлем! ___»).
 */
export function gapStartsSentence(before: string): boolean {
  return /(^\s*|[.!?…]\s+|—\s*)$/u.test(before);
}

/** Ответ так, как он стоит в предложении: в середине фразы — со строчной буквы. */
export function answerInText(text: string, answer: string): string {
  const parts = splitGap(text);
  if (!parts || gapStartsSentence(parts.before) || !answer) return answer;
  return answer.charAt(0).toLocaleLowerCase('kk') + answer.slice(1);
}

/** Предложение с вставленным ответом; суффикс сразу после ___ («___дан») приклеивается к слову. */
export function fillGap(text: string, answer: string): string {
  const parts = splitGap(text);
  if (!parts) return text;
  return parts.before + answerInText(text, answer) + parts.after;
}

export type ChoiceDir = 'kk-ru' | 'ru-kk';

/** Задание «выбери карточку»: показано prompt, верный вариант — answer. */
export interface ChoiceTask {
  /** уникален в пределах шага, в т.ч. у вернувшегося задания */
  id: string;
  word_id: number;
  dir: ChoiceDir;
  prompt: string;
  answer: string;
  options: string[];
}

const norm = (s: string) => s.trim().toLocaleLowerCase('kk');

/** Варианты: верный + до (size − 1) неверных из пула без повторов, перемешаны. */
export function pickOptions(answer: string, pool: readonly string[], size = 4, rand: () => number = Math.random): string[] {
  const seen = new Set([norm(answer)]);
  const wrong: string[] = [];
  for (const p of shuffle(pool, rand)) {
    const k = norm(p);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    wrong.push(p);
    if (wrong.length >= size - 1) break;
  }
  return shuffle([answer, ...wrong], rand);
}

/**
 * Задания на выбор для слов шага: сначала по-казахски → выбери перевод (по порядку
 * знакомства), потом по-русски → выбери казахское слово (вперемешку).
 * Неверные карточки — из других слов шага и distractors.
 */
export function buildChoiceTasks(
  items: readonly Pick<QuestItem, 'word_id' | 'kk' | 'ru'>[],
  distractors: readonly { kk: string; ru: string }[],
  rand: () => number = Math.random,
): ChoiceTask[] {
  const pool = [...items, ...distractors];
  const kkPool = pool.map((p) => p.kk);
  const ruPool = pool.map((p) => p.ru);
  const toRu = items.map(
    (it): ChoiceTask => ({
      id: `${it.word_id}:kk-ru`,
      word_id: it.word_id,
      dir: 'kk-ru',
      prompt: it.kk,
      answer: it.ru,
      options: pickOptions(it.ru, ruPool, 4, rand),
    }),
  );
  const toKk = shuffle(items, rand).map(
    (it): ChoiceTask => ({
      id: `${it.word_id}:ru-kk`,
      word_id: it.word_id,
      dir: 'ru-kk',
      prompt: it.ru,
      answer: it.kk,
      options: pickOptions(it.kk, kkPool, 4, rand),
    }),
  );
  return [...toRu, ...toKk];
}

/** Задание, на которое ответили неверно, возвращается в конец с перемешанными вариантами. */
export function retryTask(task: ChoiceTask, attempt: number, rand: () => number = Math.random): ChoiceTask {
  return { ...task, id: `${task.id.split('#')[0]}#${attempt}`, options: shuffle(task.options, rand) };
}

/** Остановка на тропе карты: x в процентах ширины, y в пикселях. */
export interface TrailPoint {
  x: number;
  y: number;
}

export const TRAIL_ROW = 116;
export const TRAIL_TOP = 64;

/** Остановки змейкой: попеременно слева и справа, сверху вниз. */
export function trailPoints(count: number): TrailPoint[] {
  return Array.from({ length: count }, (_, i) => ({ x: i % 2 === 0 ? 30 : 70, y: TRAIL_TOP + i * TRAIL_ROW }));
}

/** Плавная тропа через остановки (SVG path, viewBox 0..100 по x). */
export function trailPath(points: readonly TrailPoint[]): string {
  if (!points.length) return '';
  const [first, ...rest] = points;
  let d = `M${first!.x} ${first!.y}`;
  let prev = first!;
  for (const p of rest) {
    const mid = (p.y - prev.y) / 2;
    d += ` C${prev.x} ${prev.y + mid} ${p.x} ${p.y - mid} ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}
