import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { meRoutes } from './me.js';

/**
 * Все модули здесь регистрируются внутри аутентифицированной области
 * (request.user всегда задан). Добавляйте новые плагины в массив.
 * Пути пишите полностью в роуте: '/v1/...' или '/admin/...'.
 */
export const routes: FastifyPluginAsyncZod[] = [meRoutes];
