import { QUESTS, type QuestDef, type QuestItemDef } from './content.js';

// Варианты ответа карточками для слов квестов (квест и общий повтор в уроке).

/** Перемешивание Фишера — Йетса (новый массив). */
export function shuffle<T>(list: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Верный ответ + до k неверных из pool (без повторов и без верного), перемешано. */
export function withDistractors(correct: string, pool: readonly string[], k: number): string[] {
  const others = shuffle([...new Set(pool)].filter((x) => x !== correct)).slice(0, k);
  return shuffle([correct, ...others]);
}

export function questItems(quest: QuestDef, uptoStep = quest.steps.length): QuestItemDef[] {
  return quest.steps.slice(0, uptoStep).flatMap((s) => s.items);
}

export function findQuest(slug: string): QuestDef | undefined {
  return QUESTS.find((q) => q.slug === slug);
}

/** Все kk из всех квестов (без повторов). */
export const ALL_QUEST_KK: readonly string[] = [...new Set(QUESTS.flatMap((q) => questItems(q).map((i) => i.kk)))];

/** kk → kk остальных слов первого квеста, где слово встречается. */
const SIBLINGS = new Map<string, string[]>();
for (const q of QUESTS) {
  const kks = [...new Set(questItems(q).map((i) => i.kk))];
  for (const kk of kks) if (!SIBLINGS.has(kk)) SIBLINGS.set(kk, kks.filter((x) => x !== kk));
}

/**
 * Варианты для повтора в обычном уроке: верный kk + 3 неверных, сначала из того же квеста,
 * потом из других квестов и fallback. null — не из чего составить выбор (тогда ответ печатается).
 */
export function lessonOptions(kk: string, fallback: readonly string[] = []): string[] | null {
  const same = shuffle(SIBLINGS.get(kk) ?? []);
  const rest = shuffle([...ALL_QUEST_KK, ...fallback].filter((x) => x !== kk && !same.includes(x)));
  const others = [...new Set([...same, ...rest])].slice(0, 3);
  return others.length ? shuffle([kk, ...others]) : null;
}
