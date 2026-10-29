import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { InitDataInvalid, validateInitData, type TelegramUser } from '../auth/initData.js';
import type { UserRow } from '../db/schema.js';
import { AppError } from '../errors.js';
import { getOrCreateUser } from '../services/users.js';

export interface AuthUser {
  /** Telegram id */
  id: number;
  tg: TelegramUser;
  /** строка users на момент начала запроса */
  row: UserRow;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    /** onRequest/preHandler-хук: проверяет initData и заполняет request.user */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractCredentials(req: FastifyRequest): { tg: TelegramUser; startParam: string | null } {
  const { config } = req.server;

  const dev = req.headers['x-dev-user'];
  if (config.NODE_ENV === 'development' && typeof dev === 'string' && /^\d+$/.test(dev)) {
    const startParam = req.headers['x-dev-start-param'];
    return {
      tg: { id: Number(dev), first_name: `Dev ${dev}`, username: `dev${dev}` },
      startParam: typeof startParam === 'string' ? startParam : null,
    };
  }

  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('tma ')) throw new AppError(401, 'unauthorized', 'Missing Authorization: tma <initData>');
  try {
    const data = validateInitData(auth.slice(4), config.BOT_TOKEN);
    return { tg: data.user, startParam: data.startParam };
  } catch (e) {
    if (e instanceof InitDataInvalid) throw new AppError(401, 'invalid_init_data', e.message);
    throw e;
  }
}

/** Только для админ-роутов: после authenticate. */
export function requireAdmin(req: FastifyRequest): void {
  if (!req.server.config.ADMIN_IDS.includes(req.user.id)) throw new AppError(403, 'forbidden');
}

export default fp(
  async (app) => {
    app.decorateRequest('user');
    app.decorate('authenticate', async (req: FastifyRequest) => {
      const { tg, startParam } = extractCredentials(req);
      const row = await getOrCreateUser(app.db, tg, startParam);
      req.user = { id: tg.id, tg, row };
    });
  },
  { name: 'auth' },
);
