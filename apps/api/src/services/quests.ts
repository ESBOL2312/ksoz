import {
  QUEST_REWARD,
  type QuestItem,
  type QuestStep,
  type QuestStepCompleteResponse,
  type QuestSummary,
  type QuestsResponse,
} from '@ksoz/shared';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { userQuests, userWords, users, words, type UserRow } from '../db/schema.js';
import { conflict, notFound } from '../errors.js';
import { QUESTS, type QuestDef, type QuestStepDef } from '../quests/content.js';
import { findQuest, questItems, shuffle, withDistractors } from '../quests/options.js';
import { applyAltyn } from './altyn.js';
import { nextStreak } from './economy.js';
import { examplesFor, newLeftToday } from './lesson.js';

type Q = Db | Tx;

/** Сколько повторов показывать в начале шага. */
const STEP_REVIEW_MAX = 4;

/** Строки words для kk из квестов (kk → строка). Слова сидятся из src/quests/content.ts. */
async function wordsByKk(q: Q, kks: readonly string[]) {
  if (!kks.length) return new Map<string, typeof words.$inferSelect>();
  const rows = await q.select().from(words).where(inArray(words.kk, [...new Set(kks)]));
  return new Map(rows.map((w) => [w.kk, w]));
}

/** word_id → строка user_words пользователя (только для переданных слов). */
async function userWordsOf(q: Q, userId: number, wordIds: number[]) {
  if (!wordIds.length) return new Map<number, typeof userWords.$inferSelect>();
  const rows = await q
    .select()
    .from(userWords)
    .where(and(eq(userWords.userId, userId), inArray(userWords.wordId, wordIds)));
  return new Map(rows.map((r) => [r.wordId, r]));
}

async function progressOf(q: Q, userId: number, slug?: string) {
  const rows = await q
    .select()
    .from(userQuests)
    .where(slug ? and(eq(userQuests.userId, userId), eq(userQuests.questSlug, slug)) : eq(userQuests.userId, userId));
  return new Map(rows.map((r) => [r.questSlug, r]));
}

function stepOrThrow(slug: string, n: number): { quest: QuestDef; step: QuestStepDef } {
  const quest = findQuest(slug);
  if (!quest) throw notFound('quest_not_found');
  const step = quest.steps[n - 1];
  if (!step) throw notFound('step_not_found');
  return { quest, step };
}

export async function listQuests(db: Db, user: UserRow, now = new Date()): Promise<QuestsResponse> {
  const progress = await progressOf(db, user.id);
  const byKk = await wordsByKk(
    db,
    QUESTS.flatMap((q) => questItems(q).map((i) => i.kk)),
  );
  const learned = await userWordsOf(
    db,
    user.id,
    [...byKk.values()].map((w) => w.id),
  );
  const newLeft = await newLeftToday(db, user, now);

  const quests: QuestSummary[] = QUESTS.map((quest) => {
    const p = progress.get(quest.slug);
    const stepsDone = Math.min(p?.stepsDone ?? 0, quest.steps.length);
    const completed = stepsDone >= quest.steps.length;
    const steps = quest.steps.map((s, i) => {
      const n = i + 1;
      const newCount = s.items.filter((it) => {
        const w = byKk.get(it.kk);
        return !w || !learned.has(w.id);
      }).length;
      return {
        n,
        title_kk: s.titleKk,
        title_ru: s.titleRu,
        status: n <= stepsDone ? ('done' as const) : n === stepsDone + 1 ? ('current' as const) : ('locked' as const),
        new_count: newCount,
      };
    });
    const current = steps[stepsDone];
    return {
      slug: quest.slug,
      title_kk: quest.titleKk,
      title_ru: quest.titleRu,
      goal_ru: quest.goal,
      steps_total: quest.steps.length,
      steps_done: stepsDone,
      completed,
      steps,
      current_blocked: current && current.new_count > newLeft ? 'daily_limit' : null,
    };
  });
  return { quests, new_left_today: newLeft };
}

export async function getQuestStep(
  db: Db,
  user: UserRow,
  slug: string,
  n: number,
  now = new Date(),
): Promise<QuestStep> {
  const { quest, step } = stepOrThrow(slug, n);
  const stepsDone = (await progressOf(db, user.id, slug)).get(slug)?.stepsDone ?? 0;
  // пройденные шаги можно переиграть, следующие за текущим закрыты
  if (n > stepsDone + 1) throw conflict('step_locked');

  const all = questItems(quest);
  const allKk = [...new Set(all.map((i) => i.kk))];
  const byKk = await wordsByKk(db, allKk);
  const stepWords = step.items.flatMap((it) => {
    const w = byKk.get(it.kk);
    return w ? [{ def: it, word: w }] : [];
  });
  const learned = await userWordsOf(
    db,
    user.id,
    stepWords.map((s) => s.word.id),
  );
  const examples = await examplesFor(
    db,
    stepWords.map((s) => s.word.id),
  );

  const items: QuestItem[] = stepWords.map(({ def, word }) => ({
    word_id: word.id,
    kk: word.kk,
    ru: word.ru,
    kind: def.kind,
    note: def.note ?? null,
    examples: examples.get(word.id) ?? [],
    image_url: word.imageUrl,
    audio_url: word.audioUrl,
    state: learned.has(word.id) ? 'learning' : 'new',
  }));

  // повтор: слова этого квеста из предыдущих шагов, у которых подошло время
  const earlierIds = [
    ...new Set(
      questItems(quest, n - 1).flatMap((it) => {
        const w = byKk.get(it.kk);
        return w ? [w.id] : [];
      }),
    ),
  ];
  const due = earlierIds.length
    ? await db
        .select({ wordId: words.id, kk: words.kk, ru: words.ru })
        .from(userWords)
        .innerJoin(words, eq(words.id, userWords.wordId))
        .where(and(eq(userWords.userId, user.id), inArray(userWords.wordId, earlierIds), lte(userWords.dueAt, now)))
        .orderBy(asc(userWords.dueAt), asc(words.id))
        .limit(STEP_REVIEW_MAX)
    : [];
  const review = due.map((d) => ({ word_id: d.wordId, ru: d.ru, options: withDistractors(d.kk, allKk, 3) }));

  const distractors = [...new Map(all.map((i) => [i.kk, { kk: i.kk, ru: i.ru }])).values()];

  const seenKk = questItems(quest, n).map((i) => i.kk);
  const life = step.life.map((l) => ({
    situation_ru: l.situation,
    text: l.text,
    ru: l.ru,
    answer: l.answer,
    options: withDistractors(l.answer, seenKk, 3),
  }));

  const meLines = (step.dialog ?? []).filter((d) => d.who === 'me').map((d) => d.kk);
  const dialog = (step.dialog ?? []).map((d) => ({
    who: d.who,
    kk: d.kk,
    ru: d.ru,
    options: d.who === 'me' ? withDistractors(d.kk, meLines, 2) : null,
  }));

  return {
    slug: quest.slug,
    n,
    steps_total: quest.steps.length,
    title_kk: step.titleKk,
    title_ru: step.titleRu,
    intro_ru: step.intro,
    npc: quest.npc,
    review: shuffle(review),
    items,
    distractors,
    life,
    dialog,
  };
}

/**
 * Завершение текущего шага: +1 к steps_done, награда QUEST_REWARD.STEP (+ QUEST за последний шаг),
 * серия как за ответ. Повтор для уже пройденного шага ничего не начисляет.
 */
export async function completeQuestStep(
  db: Db,
  userId: number,
  slug: string,
  n: number,
  now = new Date(),
): Promise<QuestStepCompleteResponse> {
  const { quest, step } = stepOrThrow(slug, n);
  const total = quest.steps.length;

  return db.transaction(async (tx) => {
    // блокировка пользователя сериализует завершения шага (идемпотентность награды)
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw notFound('user_not_found');

    const row = (await progressOf(tx, userId, slug)).get(slug);
    const stepsDone = row?.stepsDone ?? 0;
    if (n <= stepsDone) {
      const done = stepsDone >= total;
      return { reward: 0, balance: user.altyn, quest_completed: done, next_step: done ? null : stepsDone + 1 };
    }
    if (n > stepsDone + 1) throw conflict('step_locked');

    const byKk = await wordsByKk(
      tx,
      step.items.map((i) => i.kk),
    );
    const ids = step.items.map((i) => byKk.get(i.kk)?.id);
    const learned = await userWordsOf(
      tx,
      userId,
      ids.filter((id): id is number => id !== undefined),
    );
    if (ids.some((id) => id === undefined || !learned.has(id))) throw conflict('step_words_missing');

    const last = n === total;
    await tx
      .insert(userQuests)
      .values({ userId, questSlug: slug, stepsDone: n, startedAt: now, completedAt: last ? now : null })
      .onConflictDoUpdate({
        target: [userQuests.userId, userQuests.questSlug],
        set: { stepsDone: n, completedAt: last ? now : null },
      });

    const reward = QUEST_REWARD.STEP + (last ? QUEST_REWARD.QUEST : 0);
    const { balance } = await applyAltyn(tx, userId, reward, 'quest', `${slug}:${n}`, now);
    await tx.update(users).set(nextStreak(user, now, user.timezone)).where(eq(users.id, userId));

    return { reward, balance, quest_completed: last, next_step: last ? null : n + 1 };
  });
}
