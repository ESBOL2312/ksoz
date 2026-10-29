import {
  BaigeQuerySchema,
  BaigeResponseSchema,
  BazaarResponseSchema,
  EquipBodySchema,
  EquipResponseSchema,
  ImportLocalBodySchema,
  ImportLocalResponseSchema,
  InviteResponseSchema,
  PurchaseBodySchema,
  PurchaseResponseSchema,
} from '@ksoz/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getBaige, inviteLink } from '../services/baige.js';
import { equipItem, listBazaar, purchaseItem } from '../services/bazaar.js';
import { importLocal } from '../services/import.js';

export const economyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/v1/bazaar', { schema: { response: { 200: BazaarResponseSchema } } }, (req) =>
    listBazaar(app.db, req.user.row),
  );

  app.post(
    '/v1/bazaar/purchase',
    { schema: { body: PurchaseBodySchema, response: { 200: PurchaseResponseSchema } } },
    (req) => purchaseItem(app.db, req.user.id, req.body.item_id),
  );

  app.post(
    '/v1/inventory/equip',
    { schema: { body: EquipBodySchema, response: { 200: EquipResponseSchema } } },
    (req) => equipItem(app.db, req.user.id, req.body.item_id, req.body.equipped),
  );

  app.post(
    '/v1/import/local',
    { bodyLimit: 512 * 1024, schema: { body: ImportLocalBodySchema, response: { 200: ImportLocalResponseSchema } } },
    (req) => importLocal(app.db, req.user.id, req.body),
  );

  app.get('/v1/baige', { schema: { querystring: BaigeQuerySchema, response: { 200: BaigeResponseSchema } } }, (req) =>
    getBaige(app.db, req.user.row, req.query.scope),
  );

  app.get('/v1/invite', { schema: { response: { 200: InviteResponseSchema } } }, (req) => ({
    link: inviteLink(app.config, req.user.id),
  }));
};
