import { pino } from 'pino';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './db/seed.js';
import { startWorker } from './worker/index.js';

const COMMANDS = ['serve', 'worker', 'migrate', 'seed'] as const;
type Command = (typeof COMMANDS)[number];

async function serve() {
  const config = loadConfig();
  const app = await buildApp(config);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => void app.close().then(() => process.exit(0)));
  }
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

async function worker() {
  const config = loadConfig();
  const log = pino({ level: config.LOG_LEVEL });
  const { db, pool } = createDb(config.DATABASE_URL);
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
  const { db, pool } = createDb(config.DATABASE_URL);
  try {
    await fn(db);
  } finally {
    await pool.end();
  }
}

const handlers: Record<Command, () => Promise<void>> = {
  serve,
  worker,
  migrate: () => withDb(runMigrations),
  seed: () => withDb(seed),
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
