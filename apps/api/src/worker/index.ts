import type { Logger } from 'pino';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';

export interface WorkerContext {
  config: Config;
  db: Db;
  log: Logger;
}

/**
 * Точка расширения воркера (pg-boss: напоминания, итоги бәйге).
 * Возвращает функцию остановки; вызывается из `main.ts worker`.
 */
export async function startWorker(ctx: WorkerContext): Promise<{ stop: () => Promise<void> }> {
  ctx.log.info('worker started (no jobs registered yet)');
  return { stop: async () => {} };
}
