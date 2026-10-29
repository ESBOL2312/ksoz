import type { FastifyInstance } from 'fastify';

/**
 * Точка расширения для бота (grammY через webhook).
 * Вызывается из buildApp() вне аутентифицированной области:
 * здесь регистрируется POST /bot/webhook с проверкой X-Telegram-Bot-Api-Secret-Token.
 */
export function registerBot(_app: FastifyInstance): void {
  // заглушка
}
