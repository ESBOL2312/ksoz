import { GrammyError } from 'grammy';
import type { Logger } from 'pino';
import type { Db } from '../db/client.js';
import { getUserForSend, lastSentAt, logSent, markBlocked } from './queries.js';
import { reminderText } from './messages.js';
import type { RateLimiter } from './rateLimiter.js';
import { periodKey, SHORT_MIN_GAP_MS } from './rules.js';
import type { SendPayload } from './scan.js';

/** Низкоуровневая отправка текста пользователю (в проде: bot.api.sendMessage с кнопкой). */
export type SendFn = (userId: number, text: string) => Promise<void>;

export type SendOutcome = 'sent' | 'skipped' | 'blocked';

export interface SendDeps {
  db: Db;
  send: SendFn;
  limiter: RateLimiter;
  log: Pick<Logger, 'info' | 'warn' | 'error'>;
  now?: () => Date;
  maxRetries?: number;
}

export async function sendReminder(deps: SendDeps, p: SendPayload): Promise<SendOutcome> {
  const { db, send, limiter, log } = deps;
  const now = deps.now ?? (() => new Date());
  const user = await getUserForSend(db, p.userId);
  if (!user || user.botBlocked) return 'skipped';

  // повторная проверка: между сканом и отправкой могло уйти то же самое
  const last = await lastSentAt(db, p.userId, p.kind);
  if (last) {
    const dup =
      p.kind === 'short'
        ? now().getTime() - last.getTime() < SHORT_MIN_GAP_MS
        : periodKey(p.kind, last, user.timezone) === p.period;
    if (dup) return 'skipped';
  }

  const text = reminderText(p.kind, p);
  const maxRetries = deps.maxRetries ?? 3;
  for (let attempt = 0; ; attempt++) {
    await limiter.take();
    try {
      await send(p.userId, text);
      await logSent(db, p.userId, p.kind, now());
      return 'sent';
    } catch (err) {
      if (err instanceof GrammyError) {
        if (err.error_code === 403) {
          await markBlocked(db, p.userId);
          log.info({ userId: p.userId }, 'bot blocked by user');
          return 'blocked';
        }
        if (err.error_code === 429 && attempt < maxRetries) {
          const wait = (err.parameters?.retry_after ?? 1) * 1000;
          log.warn({ wait }, 'telegram 429, pausing');
          limiter.pause(wait);
          continue;
        }
      }
      throw err; // pg-boss повторит задание
    }
  }
}
