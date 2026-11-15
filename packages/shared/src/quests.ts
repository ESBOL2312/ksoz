import { z } from 'zod';
import { ExampleSchema } from './api.js';

// Режим квестов: тема из 10 шагов, шаг = маленькая жизненная ситуация.
// В квесте ответы выбираются карточками (без печати). Поля API — snake_case.

const Id = z.number().int().positive();

export const QuestStepStatusSchema = z.enum(['done', 'current', 'locked']);
export type QuestStepStatus = z.infer<typeof QuestStepStatusSchema>;

export const QuestStepSummarySchema = z.object({
  n: z.number().int().min(1),
  title_kk: z.string(),
  title_ru: z.string(),
  status: QuestStepStatusSchema,
  /** сколько слов шага пользователь ещё не взял в изучение */
  new_count: z.number().int(),
});

export const QuestSummarySchema = z.object({
  slug: z.string(),
  title_kk: z.string(),
  title_ru: z.string(),
  /** что человек сможет после квеста */
  goal_ru: z.string(),
  steps_total: z.number().int(),
  steps_done: z.number().int(),
  completed: z.boolean(),
  steps: z.array(QuestStepSummarySchema),
  /**
   * Текущий шаг нельзя начать сегодня: в нём больше новых слов,
   * чем осталось в дневном лимите (лимит общий с обычным режимом).
   */
  current_blocked: z.enum(['daily_limit']).nullable(),
});
export type QuestSummary = z.infer<typeof QuestSummarySchema>;

export const QuestsResponseSchema = z.object({
  quests: z.array(QuestSummarySchema),
  new_left_today: z.number().int(),
});
export type QuestsResponse = z.infer<typeof QuestsResponseSchema>;

export const QuestStepParamsSchema = z.object({
  slug: z.string().min(1).max(64),
  n: z.coerce.number().int().min(1).max(50),
});

/** Слово или готовая фраза шага. */
export const QuestItemSchema = z.object({
  word_id: Id,
  kk: z.string(),
  ru: z.string(),
  kind: z.enum(['word', 'phrase']),
  /** подсказка Барыса: когда это говорят */
  note: z.string().nullable(),
  examples: z.array(ExampleSchema),
  image_url: z.string().nullable(),
  audio_url: z.string().nullable(),
  /** new — ещё не в изучении; learning — уже в изучении (например, из обычного режима) */
  state: z.enum(['new', 'learning']),
});
export type QuestItem = z.infer<typeof QuestItemSchema>;

/**
 * Повтор слова квеста, у которого подошло время. Ответ — выбор карточки,
 * уходит в POST /v1/reviews с mode=choice; казахское слово клиенту не сообщается.
 */
export const QuestReviewCardSchema = z.object({
  word_id: Id,
  ru: z.string(),
  /** 3–4 казахских варианта, один верный */
  options: z.array(z.string()).min(2),
});
export type QuestReviewCard = z.infer<typeof QuestReviewCardSchema>;

/** «В жизни»: предложение с пропуском, проверяется на клиенте (тренировка без SRS и алтына). */
export const QuestLifeSchema = z.object({
  /** ситуация по-русски: «Утром встречаешь соседку» */
  situation_ru: z.string(),
  /** казахская фраза, ___ — место пропуска */
  text: z.string(),
  /** перевод всей фразы */
  ru: z.string(),
  answer: z.string(),
  options: z.array(z.string()).min(2),
});
export type QuestLife = z.infer<typeof QuestLifeSchema>;

/** Реплика итогового диалога. У реплик «me» есть варианты ответа. */
export const QuestDialogLineSchema = z.object({
  who: z.enum(['npc', 'me']),
  kk: z.string(),
  ru: z.string(),
  /** только для who=me: варианты, kk — верный */
  options: z.array(z.string()).nullable(),
});
export type QuestDialogLine = z.infer<typeof QuestDialogLineSchema>;

export const QuestStepSchema = z.object({
  slug: z.string(),
  n: z.number().int(),
  steps_total: z.number().int(),
  title_kk: z.string(),
  title_ru: z.string(),
  /** реплика Барыса в начале шага */
  intro_ru: z.string(),
  /** имя жителя аула, который говорит в предложениях и диалоге */
  npc: z.string().nullable(),
  review: z.array(QuestReviewCardSchema),
  items: z.array(QuestItemSchema),
  /** слова квеста для неверных карточек в заданиях на выбор */
  distractors: z.array(z.object({ kk: z.string(), ru: z.string() })),
  life: z.array(QuestLifeSchema),
  /** только у последнего шага */
  dialog: z.array(QuestDialogLineSchema),
});
export type QuestStep = z.infer<typeof QuestStepSchema>;

export const QuestStepCompleteResponseSchema = z.object({
  /** алтын за шаг (+ за квест, если это последний шаг) */
  reward: z.number().int(),
  balance: z.number().int(),
  quest_completed: z.boolean(),
  /** следующий шаг; null — квест пройден */
  next_step: z.number().int().nullable(),
});
export type QuestStepCompleteResponse = z.infer<typeof QuestStepCompleteResponseSchema>;

/** Награды квеста. */
export const QUEST_REWARD = { STEP: 20, QUEST: 100 } as const;
