import {
  HintBodySchema,
  HintResponseSchema,
  HomeSchema,
  IntroduceBodySchema,
  IntroduceResponseSchema,
  LessonQuerySchema,
  LessonSchema,
  ReviewBodySchema,
  ReviewResponseSchema,
  TaskClaimParamsSchema,
  TaskClaimResponseSchema,
  TopicsResponseSchema,
  WordsQuerySchema,
  WordsResponseSchema,
} from '@ksoz/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getHome } from '../services/home.js';
import { getLesson, hintFor, introduceWord } from '../services/lesson.js';
import { submitReview } from '../services/reviews.js';
import { claimTask } from '../services/tasks.js';
import { listTopics, listWords } from '../services/words.js';

const limit60 = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

export const learningRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/v1/home', { schema: { response: { 200: HomeSchema } } }, (req) => getHome(app.db, req.user.row));

  app.get('/v1/lesson', { schema: { querystring: LessonQuerySchema, response: { 200: LessonSchema } } }, (req) =>
    getLesson(app.db, req.user.row, req.query.limit),
  );

  app.post(
    '/v1/lesson/introduce',
    { schema: { body: IntroduceBodySchema, response: { 200: IntroduceResponseSchema } } },
    (req) => introduceWord(app.db, req.user.row, req.body.word_id),
  );

  app.post(
    '/v1/lesson/hint',
    { ...limit60, schema: { body: HintBodySchema, response: { 200: HintResponseSchema } } },
    (req) => hintFor(app.db, req.user.id, req.body.word_id, req.body.hints_used),
  );

  app.post(
    '/v1/reviews',
    { ...limit60, schema: { body: ReviewBodySchema, response: { 200: ReviewResponseSchema } } },
    (req) => submitReview(app.db, req.user.id, req.body),
  );

  app.get('/v1/words', { schema: { querystring: WordsQuerySchema, response: { 200: WordsResponseSchema } } }, (req) =>
    listWords(app.db, req.user.id, req.query),
  );

  app.get('/v1/topics', { schema: { response: { 200: TopicsResponseSchema } } }, () => listTopics(app.db));

  app.post(
    '/v1/tasks/:code/claim',
    { schema: { params: TaskClaimParamsSchema, response: { 200: TaskClaimResponseSchema } } },
    (req) => claimTask(app.db, req.user.row, req.params.code),
  );
};
