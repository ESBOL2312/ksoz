import { MeSchema } from '@ksoz/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { serializeMe } from '../services/me.js';

/** Образец роута: схемы из @ksoz/shared, пользователь из request.user. */
export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/v1/me', { schema: { response: { 200: MeSchema } } }, async (req) =>
    serializeMe(req.user.row, app.config),
  );
};
