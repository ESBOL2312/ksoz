import { DEFAULT_NOTIFY, MeSchema, PatchMeBodySchema, isValidTimezone } from '@ksoz/shared';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { cities, users } from '../db/schema.js';
import { badRequest } from '../errors.js';
import { serializeMe } from '../services/me.js';

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.patch('/v1/me', { schema: { body: PatchMeBodySchema, response: { 200: MeSchema } } }, async (req) => {
    const b = req.body;
    const set: Partial<typeof users.$inferInsert> = {};
    if (b.level !== undefined) set.level = b.level;
    if (b.timezone !== undefined) {
      if (!isValidTimezone(b.timezone)) throw badRequest('invalid_timezone');
      set.timezone = b.timezone;
    }
    if (b.city_id !== undefined) {
      if (b.city_id !== null) {
        const [c] = await app.db.select({ id: cities.id }).from(cities).where(eq(cities.id, b.city_id));
        if (!c) throw badRequest('invalid_city');
      }
      set.cityId = b.city_id;
    }
    if (b.notify !== undefined) set.notify = { ...DEFAULT_NOTIFY, ...req.user.row.notify, ...b.notify };
    if (!Object.keys(set).length) return serializeMe(req.user.row, app.config);
    const [row] = await app.db.update(users).set(set).where(eq(users.id, req.user.id)).returning();
    return serializeMe(row!, app.config);
  });
};
