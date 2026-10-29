import {
  AdminIdParamsSchema,
  AdminImageBodySchema,
  AdminImportResponseSchema,
  AdminOkSchema,
  AdminStatusBodySchema,
  AdminWordInputSchema,
  AdminWordPatchSchema,
  AdminWordSchema,
  AdminWordsQuerySchema,
  AdminWordsResponseSchema,
} from '@ksoz/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAdmin } from '../plugins/auth.js';
import {
  createWord,
  deleteWord,
  getAdminWord,
  importCsv,
  listAdminWords,
  setWordImage,
  setWordStatus,
  updateWord,
} from '../services/admin.js';
import { badRequest } from '../errors.js';

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  const guard = { preHandler: async (req: Parameters<typeof requireAdmin>[0]) => requireAdmin(req) };

  // CSV приходит как text/csv или text/plain
  app.addContentTypeParser(['text/csv', 'text/plain'], { parseAs: 'string', bodyLimit: 5 * 1024 * 1024 }, (_req, body, done) =>
    done(null, body),
  );

  app.get('/admin/words', { ...guard, schema: { querystring: AdminWordsQuerySchema, response: { 200: AdminWordsResponseSchema } } }, (req) =>
    listAdminWords(app.db, req.query),
  );

  app.post(
    '/admin/words/import',
    { ...guard, bodyLimit: 5 * 1024 * 1024, schema: { response: { 200: AdminImportResponseSchema } } },
    (req) => {
      if (typeof req.body !== 'string') throw badRequest('csv_expected', 'Send CSV with Content-Type: text/csv');
      return importCsv(app.db, req.body);
    },
  );

  app.get('/admin/words/:id', { ...guard, schema: { params: AdminIdParamsSchema, response: { 200: AdminWordSchema } } }, (req) =>
    getAdminWord(app.db, req.params.id),
  );

  app.post('/admin/words', { ...guard, schema: { body: AdminWordInputSchema, response: { 200: AdminWordSchema } } }, (req) =>
    createWord(app.db, req.body),
  );

  app.patch(
    '/admin/words/:id',
    { ...guard, schema: { params: AdminIdParamsSchema, body: AdminWordPatchSchema, response: { 200: AdminWordSchema } } },
    (req) => updateWord(app.db, req.params.id, req.body),
  );

  app.delete('/admin/words/:id', { ...guard, schema: { params: AdminIdParamsSchema, response: { 200: AdminOkSchema } } }, async (req) => {
    await deleteWord(app.db, req.params.id);
    return { ok: true as const };
  });

  app.patch(
    '/admin/words/:id/status',
    { ...guard, schema: { params: AdminIdParamsSchema, body: AdminStatusBodySchema, response: { 200: AdminWordSchema } } },
    (req) => setWordStatus(app.db, req.params.id, req.body.status),
  );

  // Загрузка файла в S3 не реализована: админка присылает уже готовый URL (CDN).
  app.post(
    '/admin/words/:id/image',
    { ...guard, schema: { params: AdminIdParamsSchema, body: AdminImageBodySchema, response: { 200: AdminWordSchema } } },
    (req) => setWordImage(app.db, req.params.id, req.body.image_url),
  );
};
