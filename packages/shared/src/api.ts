import { z } from 'zod';

// Поля API — snake_case (как в примере POST /v1/reviews в спецификации).

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const CATEGORIES = ['kiim', 'uy', 'mal', 'aspap'] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const VerdictSchema = z.enum(['correct', 'almost', 'wrong']);
export const PhaseSchema = z.enum(['learning', 'review']);
export const WordStatusSchema = z.enum(['draft', 'reviewed', 'published']);

const IsoDate = z.string(); // ISO 8601 (timestamptz)
const Id = z.number().int().positive();

export const NotifySchema = z.object({
  short: z.boolean(),
  daily: z.boolean(),
  streak: z.boolean(),
  baige: z.boolean(),
});
export type Notify = z.infer<typeof NotifySchema>;
export const DEFAULT_NOTIFY: Notify = { short: true, daily: true, streak: true, baige: true };

export const ExampleSchema = z.object({ kk: z.string(), ru: z.string() });

export const NextStateSchema = z.object({
  phase: PhaseSchema,
  step: z.number().int().min(0).max(3),
  due_at: IsoDate,
});

// --- me ---
export const MeSchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  username: z.string().nullable(),
  level: LevelSchema,
  city_id: z.number().int().nullable(),
  timezone: z.string(),
  altyn: z.number().int(),
  combo: z.number().int(),
  streak_current: z.number().int(),
  streak_best: z.number().int(),
  aul_stage: z.number().int(),
  notify: NotifySchema,
  is_admin: z.boolean(),
  created_at: IsoDate,
});
export type Me = z.infer<typeof MeSchema>;

export const PatchMeBodySchema = z
  .object({
    level: LevelSchema,
    city_id: z.number().int().positive().nullable(),
    timezone: z.string().min(1).max(64),
    notify: NotifySchema.partial(),
  })
  .partial();
export type PatchMeBody = z.infer<typeof PatchMeBodySchema>;

// --- home ---
export const DailyTaskSchema = z.object({
  code: z.string(),
  progress: z.number().int(),
  target: z.number().int(),
  reward: z.number().int(),
  claimed: z.boolean(),
});
export type DailyTask = z.infer<typeof DailyTaskSchema>;

export const EquippedItemSchema = z.object({
  item_id: Id,
  category: CategorySchema,
  slot: z.string(),
  kk: z.string(),
  image_url: z.string().nullable(),
});

export const HomeSchema = z.object({
  altyn: z.number().int(),
  combo: z.number().int(),
  streak_current: z.number().int(),
  aul_stage: z.number().int(),
  equipped: z.array(EquippedItemSchema),
  due_count: z.number().int(),
  new_left_today: z.number().int(),
  tasks: z.array(DailyTaskSchema),
});
export type Home = z.infer<typeof HomeSchema>;

// --- lesson ---
export const LessonQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const LessonCardSchema = z.object({
  kind: z.enum(['review', 'new']),
  word_id: Id,
  ru: z.string(),
  image_url: z.string().nullable(),
  audio_url: z.string().nullable(),
  /** Только для kind=new: слово показывается целиком. Для повтора — null. */
  kk: z.string().nullable(),
  examples: z.array(ExampleSchema),
  phase: PhaseSchema,
  step: z.number().int(),
  length: z.number().int(),
});
export const LessonSchema = z.object({ cards: z.array(LessonCardSchema) });
export type LessonCard = z.infer<typeof LessonCardSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export const IntroduceBodySchema = z.object({ word_id: Id });
export const IntroduceResponseSchema = z.object({ next: NextStateSchema });

export const HintBodySchema = z.object({
  word_id: Id,
  /** сколько подсказок уже использовано в этой попытке */
  hints: z.number().int().min(0).max(50),
});
export const HintResponseSchema = z.object({ hint: z.string(), hints: z.number().int() });

// --- reviews ---
export const ReviewBodySchema = z.object({
  client_id: z.string().uuid(),
  word_id: Id,
  input: z.string().max(200),
  hints: z.number().int().min(0).max(50).default(0),
  ms: z.number().int().min(0).max(3_600_000).default(0),
});
export type ReviewBody = z.infer<typeof ReviewBodySchema>;

export const ReviewResponseSchema = z.object({
  verdict: VerdictSchema,
  answer: z.string(),
  fix: z.array(z.object({ pos: z.number().int(), expected: z.string() })),
  altyn: z.object({
    base: z.number().int(),
    combo: z.number().int(),
    earned: z.number().int(),
    balance: z.number().int(),
  }),
  next: NextStateSchema,
  examples: z.array(ExampleSchema),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

// --- words / topics ---
export const WordsQuerySchema = z.object({
  level: LevelSchema.optional(),
  topic: z.string().optional(),
});
export const WordStateSchema = z.object({
  phase: PhaseSchema,
  step: z.number().int(),
  due_at: IsoDate,
  reps: z.number().int(),
  lapses: z.number().int(),
});
export const WordListItemSchema = z.object({
  id: Id,
  kk: z.string(),
  ru: z.string(),
  level: LevelSchema,
  image_url: z.string().nullable(),
  state: WordStateSchema.nullable(),
});
export const WordsResponseSchema = z.object({ words: z.array(WordListItemSchema) });

export const TopicSchema = z.object({
  id: Id,
  slug: z.string(),
  name_kk: z.string(),
  name_ru: z.string(),
  words: z.number().int(),
});
export const TopicsResponseSchema = z.object({
  topics: z.array(TopicSchema),
  levels: z.array(z.object({ level: LevelSchema, words: z.number().int() })),
});

// --- bazaar ---
export const BazaarItemSchema = z.object({
  id: Id,
  word_id: Id,
  kk: z.string(),
  ru: z.string(),
  category: CategorySchema,
  slot: z.string(),
  price: z.number().int(),
  min_level: LevelSchema,
  image_url: z.string().nullable(),
  status: z.enum(['owned', 'available', 'locked']),
  equipped: z.boolean(),
});
export const BazaarResponseSchema = z.object({ items: z.array(BazaarItemSchema) });

export const PurchaseBodySchema = z.object({ item_id: Id });
export const PurchaseResponseSchema = z.object({
  item_id: Id,
  balance: z.number().int(),
  next: NextStateSchema,
});

export const EquipBodySchema = z.object({ item_id: Id, equipped: z.boolean() });
export const EquipResponseSchema = z.object({ equipped: z.array(EquippedItemSchema) });

// --- tasks ---
export const TaskClaimParamsSchema = z.object({ code: z.string().min(1).max(32) });
export const TaskClaimResponseSchema = z.object({ reward: z.number().int(), balance: z.number().int() });

// --- import из localStorage прототипа ---
export const ImportLocalBodySchema = z.object({
  cards: z
    .array(
      z.object({
        kk: z.string(),
        reps: z.number().int().min(0),
        interval: z.number().min(0),
        ef: z.number().min(1.3).max(5),
        due: z.number().int(), // день в виде числа дней с эпохи, как в прототипе
      }),
    )
    .max(500),
});
export const ImportLocalResponseSchema = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
});

// --- v2: бәйге и приглашения ---
export const BaigeQuerySchema = z.object({ scope: z.enum(['friends', 'city', 'kz']).default('friends') });
export const BaigeResponseSchema = z.object({
  week: z.string(),
  scope: z.enum(['friends', 'city', 'kz']),
  top: z.array(
    z.object({
      place: z.number().int(),
      user_id: z.number().int(),
      first_name: z.string(),
      score: z.number().int(),
    }),
  ),
  me: z.object({ place: z.number().int().nullable(), score: z.number().int() }),
  prize: z.number().int().nullable(),
});

export const InviteResponseSchema = z.object({ link: z.string() });

export type Purchase = z.infer<typeof PurchaseResponseSchema>;
export type Baige = z.infer<typeof BaigeResponseSchema>;
