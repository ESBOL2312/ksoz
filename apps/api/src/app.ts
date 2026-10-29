import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { registerBot } from './bot/index.js';
import type { Config } from './config.js';
import { createDb, type Db } from './db/client.js';
import { AppError } from './errors.js';
import authPlugin from './plugins/auth.js';
import { routes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
  }
}

export async function buildApp(config: Config, deps: { db?: Db } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  let db = deps.db;
  if (!db) {
    const created = createDb(config.DATABASE_URL);
    db = created.db;
    app.addHook('onClose', async () => {
      await created.pool.end();
    });
  }
  app.decorate('config', config);
  app.decorate('db', db);

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({ error: 'validation_error', message: err.message });
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.code, message: err.message });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.status(status).send({ error: 'bad_request', message: (err as Error).message });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({ error: 'internal_error' });
  });

  await app.register(cors, {
    origin: config.NODE_ENV === 'production' ? config.WEB_ORIGIN : true,
    allowedHeaders: ['authorization', 'content-type', 'x-dev-user', 'x-dev-start-param'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Лимит на пользователя (после authenticate) или на IP. Для отдельных роутов:
  // { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    hook: 'preHandler',
    allowList: (req) => req.url === '/health',
    keyGenerator: (req) => (req.user ? `u:${req.user.id}` : req.ip),
  });

  await app.register(authPlugin);

  app.get('/health', async (_req, reply) => {
    try {
      await app.db.execute(sql`select 1`);
      return { status: 'ok', db: 'ok' };
    } catch (err) {
      app.log.error({ err }, 'health check failed');
      return reply.status(503).send({ status: 'error', db: 'down' });
    }
  });

  await app.register(async (scope) => {
    scope.addHook('onRequest', scope.authenticate);
    for (const route of routes) await scope.register(route);
  });

  registerBot(app);
  return app;
}
