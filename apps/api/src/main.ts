import { pino } from 'pino';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { setWebhook } from './bot/index.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';
import { startWorker } from './worker/index.js';
import { startKeepAlive } from './keepalive.js';

const COMMANDS = ['serve', 'worker', 'all', 'migrate', 'seed', 'set-webhook'] as const;
type Command = (typeof COMMANDS)[number];

async function serve() {
  const config = loadConfig();
  const app = await buildApp(config);
  const keepAlive = config.KEEPALIVE_URL
    ? startKeepAlive(config.KEEPALIVE_URL, config.KEEPALIVE_MINUTES * 60_000, app.log)
    : undefined;
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      keepAlive?.stop();
      void app.close().then(() => process.exit(0));
    });
  }
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

/**
 * Всё в одном процессе (для хостинга с одним бесплатным сервисом, например Render):
 * миграции и сид (оба идемпотентны) → HTTP API + бот → воркер напоминаний.
 */
async function all() {
  const config = loadConfig();
  const log = pino({ level: config.LOG_LEVEL });
  const { db, pool } = createDb(config.DATABASE_URL, config.DB_POOL_MAX);
  await runMigrations(db);
  await seed(db);
  const app = await buildApp(config, { db });
  const keepAlive = config.KEEPALIVE_URL
    ? startKeepAlive(config.KEEPALIVE_URL, config.KEEPALIVE_MINUTES * 60_000, app.log)
    : undefined;
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  if (config.SET_WEBHOOK_ON_START) {
    try {
      log.info({ url: await setWebhook(config) }, 'webhook set');
    } catch (err) {
      log.error({ err }, 'setWebhook failed');
    }
  }
  const w = await startWorker({ config, db, log });
  const shutdown = async () => {
    keepAlive?.stop();
    await w.stop();
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

async function worker() {
  const config = loadConfig();
  const log = pino({ level: config.LOG_LEVEL });
  const { db, pool } = createDb(config.DATABASE_URL, config.DB_POOL_MAX);
  const w = await startWorker({ config, db, log });
  const keepAlive = setInterval(() => {}, 1 << 30); // пока нет pg-boss, процесс не должен выходить
  const shutdown = async () => {
    clearInterval(keepAlive);
    await w.stop();
    await pool.end();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

async function withDb(fn: (db: ReturnType<typeof createDb>['db']) => Promise<void>) {
  const config = loadConfig();
  const { db, pool } = createDb(config.DATABASE_URL, config.DB_POOL_MAX);
  try {
    await fn(db);
  } finally {
    await pool.end();
  }
}

const handlers: Record<Command, () => Promise<void>> = {
  serve,
  worker,
  all,
  migrate: () => withDb(runMigrations),
  seed: () => withDb(seed),
  'set-webhook': async () => {
    const url = await setWebhook(loadConfig());
    console.log(`webhook set: ${url}`);
  },
};

const cmd = process.argv[2] as Command;
if (!COMMANDS.includes(cmd)) {
  console.error(`Usage: node dist/main.js ${COMMANDS.join('|')}`);
  process.exit(2);
}
handlers[cmd]().catch((err) => {
  console.error(err);
  process.exit(1);
});
