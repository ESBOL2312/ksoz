import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { adminRoutes } from './admin.js';
import { economyRoutes } from './economy.js';
import { learningRoutes } from './learning.js';
import { meRoutes } from './me.js';
import { profileRoutes } from './profile.js';

/**
 * Все модули здесь регистрируются внутри аутентифицированной области
 * (request.user всегда задан). Добавляйте новые плагины в массив.
 * Пути пишите полностью в роуте: '/v1/...' или '/admin/...'.
 */
export const routes: FastifyPluginAsyncZod[] = [
  meRoutes,
  profileRoutes,
  learningRoutes,
  economyRoutes,
  adminRoutes,
];
