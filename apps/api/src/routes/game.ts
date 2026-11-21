import {
  GameCodeParamsSchema,
  GameCodeStatusQuerySchema,
  GameCodeStatusSchema,
  GameInventorySchema,
  GameLinkCodeBodySchema,
  GameLinkCodeResponseSchema,
  GameLinkIdParamsSchema,
  GameLinksResponseSchema,
  GameOkSchema,
} from '@ksoz/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../errors.js';
import {
  authenticateGameToken,
  botLinkUrl,
  claimLinkCode,
  confirmLinkCode,
  createLinkCode,
  gameInventory,
  listGameLinks,
  revokeLinkById,
  revokeUserLink,
  type GameLinkAuth,
} from '../services/game.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** задан на роутах с Authorization: Game <токен> */
    gameLink: GameLinkAuth | null;
  }
}

const perMinute = (max: number, keyGenerator?: (req: FastifyRequest) => string) => ({
  rateLimit: { max, timeWindow: '1 minute', ...(keyGenerator ? { keyGenerator } : {}) },
});

/** onRequest: проверяет токен игры и заполняет request.gameLink (initData здесь не нужен). */
async function gameAuth(req: FastifyRequest, _reply: FastifyReply) {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Game ')) throw new AppError(401, 'unauthorized', 'Missing Authorization: Game <token>');
  const link = await authenticateGameToken(req.server.db, auth.slice(5).trim());
  if (!link) throw new AppError(401, 'invalid_game_token');
  req.gameLink = link;
}

/**
 * Методы игры «Ер Төстік». Регистрируются ВНЕ аутентифицированной области (без initData),
 * токен игры даёт только чтение вещей.
 */
export const gameRoutes: FastifyPluginAsyncZod = async (app) => {
  app.decorateRequest('gameLink', null);

  app.post(
    '/v1/game/link-codes',
    { config: perMinute(20), schema: { body: GameLinkCodeBodySchema, response: { 200: GameLinkCodeResponseSchema } } },
    async (req) => {
      const { code, expiresAt } = await createLinkCode(app.db, req.body.device_id);
      return { code, expires_at: expiresAt.toISOString(), bot_url: botLinkUrl(app.config.BOT_USERNAME, code) };
    },
  );

  // игра опрашивает раз в 3 секунды; лимит на устройство, чтобы игроки за одним NAT не мешали друг другу
  app.get(
    '/v1/game/link-codes/:code',
    {
      config: perMinute(40, (req) => `gd:${(req.query as { device_id?: string }).device_id ?? req.ip}`),
      schema: { params: GameCodeParamsSchema, querystring: GameCodeStatusQuerySchema, response: { 200: GameCodeStatusSchema } },
    },
    (req) => claimLinkCode(app.db, req.params.code, req.query.device_id),
  );

  app.get(
    '/v1/game/inventory',
    { onRequest: gameAuth, config: perMinute(30), schema: { response: { 200: GameInventorySchema } } },
    (req) => gameInventory(app.db, req.gameLink!.userId),
  );

  app.delete(
    '/v1/game/link',
    { onRequest: gameAuth, config: perMinute(10), schema: { response: { 200: GameOkSchema } } },
    (req) => revokeLinkById(app.db, req.gameLink!.linkId),
  );
};

/** Методы миниаппа для связки с игрой (обычная авторизация tma, живут в общем списке routes). */
export const gameAccountRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/v1/game/link-codes/:code/confirm',
    { config: perMinute(5), schema: { params: GameCodeParamsSchema, response: { 200: GameOkSchema } } },
    (req) => confirmLinkCode(app.db, req.user.id, req.params.code),
  );

  app.get('/v1/game/links', { schema: { response: { 200: GameLinksResponseSchema } } }, (req) =>
    listGameLinks(app.db, req.user.id),
  );

  app.delete(
    '/v1/game/links/:id',
    { schema: { params: GameLinkIdParamsSchema, response: { 200: GameOkSchema } } },
    (req) => revokeUserLink(app.db, req.user.id, req.params.id),
  );
};
