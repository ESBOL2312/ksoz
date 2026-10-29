import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const TelegramUserSchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});
export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export interface InitData {
  user: TelegramUser;
  startParam: string | null;
  authDate: number;
}

export type InitDataError = 'malformed' | 'bad_hash' | 'expired';

export class InitDataInvalid extends Error {
  constructor(public readonly reason: InitDataError) {
    super(`invalid initData: ${reason}`);
  }
}

/** Проверка подписи Telegram WebApp initData. Бросает InitDataInvalid. */
export function validateInitData(
  raw: string,
  botToken: string,
  maxAgeSec = 86400,
  nowSec = Math.floor(Date.now() / 1000),
): InitData {
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) throw new InitDataInvalid('malformed');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new InitDataInvalid('bad_hash');
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) throw new InitDataInvalid('malformed');
  if (nowSec - authDate > maxAgeSec) throw new InitDataInvalid('expired');

  let user: TelegramUser;
  try {
    user = TelegramUserSchema.parse(JSON.parse(params.get('user') ?? ''));
  } catch {
    throw new InitDataInvalid('malformed');
  }
  return { user, startParam: params.get('start_param'), authDate };
}
