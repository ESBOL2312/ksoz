import { Bot } from 'grammy';
import { PgBoss } from 'pg-boss';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { openAppKeyboard } from './messages.js';
import { RateLimiter } from './rateLimiter.js';
import { runScan, SCAN_QUEUE, SEND_QUEUE, singletonKeyOf, type SendPayload } from './scan.js';
import { sendReminder, type SendFn } from './send.js';

export interface WorkerContext {
  config: Config;
  db: Db;
  log: Logger;
  /** подмена отправки (тесты); по умолчанию — Telegram Bot API */
  send?: SendFn;
}

export const MAX_MESSAGES_PER_SEC = 25;

export function telegramSender(config: Config): SendFn {
  const bot = new Bot(config.BOT_TOKEN);
  const reply_markup = openAppKeyboard(config.MINIAPP_URL);
  return async (userId, text) => {
    await bot.api.sendMessage(userId, text, { reply_markup });
  };
}

/**
 * Воркер напоминаний (pg-boss на том же DATABASE_URL):
 * reminders.scan (каждую минуту) → reminders.send (по заданию на сообщение).
 * Итоги бәйге обрабатываются тем же сканом: в воскресное окно участнику отправляется его место.
 */
export async function startWorker(ctx: WorkerContext): Promise<{ stop: () => Promise<void> }> {
  const { config, db, log } = ctx;
  const send = ctx.send ?? telegramSender(config);
  const limiter = new RateLimiter(MAX_MESSAGES_PER_SEC);

  const boss = new PgBoss(config.DATABASE_URL);
  boss.on('error', (err) => log.error({ err }, 'pg-boss error'));
  await boss.start();

  await boss.createQueue(SCAN_QUEUE, { retryLimit: 0, expireInSeconds: 120 });
  await boss.createQueue(SEND_QUEUE, {
    policy: 'short', // не больше одного ожидающего задания на singletonKey
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 300,
  });
  await boss.schedule(SCAN_QUEUE, '* * * * *');

  const enqueue = async (p: SendPayload) => {
    await boss.send(SEND_QUEUE, p, { singletonKey: singletonKeyOf(p) });
  };

  await boss.work(SCAN_QUEUE, async () => {
    const jobs = await runScan(db, new Date(), enqueue);
    if (jobs.length) log.info({ count: jobs.length }, 'reminders enqueued');
  });

  await boss.work<SendPayload>(SEND_QUEUE, { batchSize: 1, localConcurrency: 8 }, async ([job]) => {
    if (!job) return;
    await sendReminder({ db, send, limiter, log }, job.data);
  });

  log.info('worker started');
  return {
    stop: async () => {
      await boss.stop({ graceful: true, timeout: 10_000 });
    },
  };
}
