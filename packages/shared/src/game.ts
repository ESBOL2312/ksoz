import { z } from 'zod';
import { CategorySchema, type Category } from './api.js';

// Связка kSoz с игрой «Ер Төстік»: игра получает код из 6 цифр, игрок подтверждает его в боте
// или миниаппе, игра забирает токен только для чтения (Authorization: Game <токен>).

/** Код живёт 10 минут; подтверждённый код можно забрать ещё GAME_CLAIM_GRACE_MS после истечения. */
export const GAME_CODE_TTL_MS = 10 * 60_000;
export const GAME_CLAIM_GRACE_MS = 5 * 60_000;
export const GAME_CODE_RE = /^\d{6}$/;

/** Стабильные ключи рисунков вещей (они же символы спрайта миниаппа). */
export const ITEM_ART_KEYS = ['yurt', 'dombra', 'chapan', 'syrmak', 'eagle', 'horse', 'takiya', 'etik', 'cat', 'sheep', 'tea'] as const;
export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];

const ART_BY_WORD: Record<string, ItemArtKey> = {
  'киіз үй': 'yurt',
  үй: 'yurt',
  домбыра: 'dombra',
  шапан: 'chapan',
  'көк шапан': 'chapan',
  сырмақ: 'syrmak',
  бүркіт: 'eagle',
  ат: 'horse',
  жылқы: 'horse',
  тұлпар: 'horse',
  тақия: 'takiya',
  етік: 'etik',
  мысық: 'cat',
  қой: 'sheep',
  шай: 'tea',
};
const ART_BY_CATEGORY: Record<Category, ItemArtKey> = { kiim: 'chapan', uy: 'yurt', mal: 'horse', aspap: 'dombra' };

/** Рисунок вещи: по слову, иначе по категории. */
export function itemArtKey(kk: string, category: Category): ItemArtKey {
  return ART_BY_WORD[kk.trim().toLowerCase()] ?? ART_BY_CATEGORY[category];
}

const IsoDate = z.string();
/** UUID из сохранения игры; проверяем мягко, чтобы не зависеть от версии UUID */
const DeviceId = z.string().regex(/^[A-Za-z0-9-]{16,64}$/, 'device_id: 16-64 chars of A-Z, a-z, 0-9, -');
const Code = z.string().regex(GAME_CODE_RE, 'code: 6 digits');

// --- методы игры (без initData) ---
export const GameLinkCodeBodySchema = z.object({ device_id: DeviceId });
export const GameLinkCodeResponseSchema = z.object({
  code: Code,
  expires_at: IsoDate,
  /** t.me/<бот>?start=link_<код> */
  bot_url: z.string(),
});

export const GameCodeParamsSchema = z.object({ code: Code });
export const GameCodeStatusQuerySchema = z.object({ device_id: DeviceId });
export const GameCodeStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending'), expires_at: IsoDate }),
  z.object({ status: z.literal('expired') }),
  /** токен отдаётся один раз; повторный запрос — 409 code_already_claimed */
  z.object({ status: z.literal('confirmed'), token: z.string(), first_name: z.string() }),
]);
export type GameCodeStatus = z.infer<typeof GameCodeStatusSchema>;

export const GameItemSchema = z.object({
  id: z.number().int().positive(),
  key: z.enum(ITEM_ART_KEYS),
  kk: z.string(),
  ru: z.string(),
  category: CategorySchema,
  slot: z.string(),
  image_url: z.string().nullable(),
  equipped: z.boolean(),
  /** появятся вместе с сетами Төстіка */
  set: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
});
export type GameItem = z.infer<typeof GameItemSchema>;
export const GameInventorySchema = z.object({
  first_name: z.string(),
  altyn: z.number().int(),
  items: z.array(GameItemSchema),
});
export type GameInventory = z.infer<typeof GameInventorySchema>;

export const GameOkSchema = z.object({ ok: z.literal(true) });

// --- методы миниаппа (tma) ---
export const GameLinkSchema = z.object({
  id: z.number().int().positive(),
  created_at: IsoDate,
  last_seen_at: IsoDate.nullable(),
});
export type GameLink = z.infer<typeof GameLinkSchema>;
export const GameLinksResponseSchema = z.object({ links: z.array(GameLinkSchema) });
export const GameLinkIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
