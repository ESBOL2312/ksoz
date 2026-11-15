import {
  QuestStepCompleteResponseSchema,
  QuestStepParamsSchema,
  QuestStepSchema,
  QuestsResponseSchema,
} from '@ksoz/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { completeQuestStep, getQuestStep, listQuests } from '../services/quests.js';

/** Режим квестов: список квестов, содержимое шага, завершение шага. */
export const questRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/v1/quests', { schema: { response: { 200: QuestsResponseSchema } } }, (req) =>
    listQuests(app.db, req.user.row),
  );

  app.get(
    '/v1/quests/:slug/steps/:n',
    { schema: { params: QuestStepParamsSchema, response: { 200: QuestStepSchema } } },
    (req) => getQuestStep(app.db, req.user.row, req.params.slug, req.params.n),
  );

  app.post(
    '/v1/quests/:slug/steps/:n/complete',
    { schema: { params: QuestStepParamsSchema, response: { 200: QuestStepCompleteResponseSchema } } },
    (req) => completeQuestStep(app.db, req.user.id, req.params.slug, req.params.n),
  );
};
