import { GAME_CLAIM_GRACE_MS, GAME_CODE_TTL_MS, itemArtKey, type GameCodeStatus, type GameInventory } from '@ksoz/shared';
import { and, asc, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { Db } from '../db/client.js';
import { gameLinkCodes, gameLinks, items, userItems, users, words } from '../db/schema.js';
import { AppError, conflict, notFound } from '../errors.js';

export const hashGameToken = (token: string) => createHash('sha256').update(token).digest('hex');

const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Ссылка, по которой игра открывает бота с уже введённым кодом. */
export const botLinkUrl = (botUsername: string, code: string) => `https://t.me/${botUsername}?start=link_${code}`;

/** POST /v1/game/link-codes: новый код для устройства (старые неподтверждённые коды устройства сгорают). */
export async function createLinkCode(db: Db, deviceId: string, now = new Date()) {
  const expiresAt = new Date(now.getTime() + GAME_CODE_TTL_MS);
  await db
    .delete(gameLinkCodes)
    .where(
      or(
        lt(gameLinkCodes.expiresAt, new Date(now.getTime() - GAME_CLAIM_GRACE_MS)),
        and(eq(gameLinkCodes.deviceId, deviceId), isNull(gameLinkCodes.confirmedAt)),
      ),
    );
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = newCode();
    const [row] = await db
      .insert(gameLinkCodes)
      .values({ code, deviceId, createdAt: now, expiresAt })
      .onConflictDoNothing()
      .returning({ code: gameLinkCodes.code });
    if (row) return { code: row.code, expiresAt };
  }
  throw new AppError(503, 'no_free_codes');
}

export type CodeCheck = 'pending' | 'expired' | 'not_found' | 'used';

/** Для бота: можно ли ещё подтвердить код. */
export async function checkLinkCode(db: Db, code: string, now = new Date()): Promise<CodeCheck> {
  const [row] = await db.select().from(gameLinkCodes).where(eq(gameLinkCodes.code, code));
  if (!row) return 'not_found';
  if (row.confirmedAt) return 'used';
  return row.expiresAt > now ? 'pending' : 'expired';
}

/** Подтверждение кода игроком (бот или миниапп). Повторное подтверждение тем же игроком — не ошибка. */
export async function confirmLinkCode(db: Db, userId: number, code: string, now = new Date()) {
  const [done] = await db
    .update(gameLinkCodes)
    .set({ userId, confirmedAt: now })
    .where(and(eq(gameLinkCodes.code, code), isNull(gameLinkCodes.confirmedAt), gt(gameLinkCodes.expiresAt, now)))
    .returning({ code: gameLinkCodes.code });
  if (done) return { ok: true as const };

  const [row] = await db.select().from(gameLinkCodes).where(eq(gameLinkCodes.code, code));
  if (!row) throw notFound('code_not_found');
  if (row.confirmedAt) {
    if (row.userId === userId) return { ok: true as const };
    throw conflict('code_already_used');
  }
  throw new AppError(410, 'code_expired');
}

/**
 * GET /v1/game/link-codes/:code: статус кода для того же устройства. Подтверждённый код
 * один раз превращается в токен (связка устройства заменяет прежнюю).
 */
export async function claimLinkCode(db: Db, code: string, deviceId: string, now = new Date()): Promise<GameCodeStatus> {
  const [row] = await db
    .select()
    .from(gameLinkCodes)
    .where(and(eq(gameLinkCodes.code, code), eq(gameLinkCodes.deviceId, deviceId)));
  // чужой device_id неотличим от несуществующего кода
  if (!row) throw notFound('code_not_found');
  if (row.claimedAt) throw conflict('code_already_claimed');

  if (!row.confirmedAt || row.userId === null) {
    return row.expiresAt > now ? { status: 'pending', expires_at: row.expiresAt.toISOString() } : { status: 'expired' };
  }
  if (now.getTime() > row.expiresAt.getTime() + GAME_CLAIM_GRACE_MS) return { status: 'expired' };

  const userId = row.userId;
  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(gameLinkCodes)
      .set({ claimedAt: now })
      .where(and(eq(gameLinkCodes.code, code), isNull(gameLinkCodes.claimedAt)))
      .returning({ code: gameLinkCodes.code });
    if (!claimed) throw conflict('code_already_claimed');

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashGameToken(token);
    await tx
      .insert(gameLinks)
      .values({ userId, deviceId, tokenHash, createdAt: now })
      .onConflictDoUpdate({
        target: gameLinks.deviceId,
        set: { userId, tokenHash, createdAt: now, lastSeenAt: null, revokedAt: null },
      });
    const [user] = await tx.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId));
    return { status: 'confirmed', token, first_name: user!.firstName };
  });
}

export interface GameLinkAuth {
  linkId: number;
  userId: number;
}

/** Проверка `Authorization: Game <токен>`; last_seen_at обновляется не чаще раза в минуту. */
export async function authenticateGameToken(db: Db, token: string, now = new Date()): Promise<GameLinkAuth | null> {
  const [link] = await db
    .select({ id: gameLinks.id, userId: gameLinks.userId, lastSeenAt: gameLinks.lastSeenAt })
    .from(gameLinks)
    .where(and(eq(gameLinks.tokenHash, hashGameToken(token)), isNull(gameLinks.revokedAt)));
  if (!link) return null;
  if (!link.lastSeenAt || now.getTime() - link.lastSeenAt.getTime() > 60_000) {
    await db.update(gameLinks).set({ lastSeenAt: now }).where(eq(gameLinks.id, link.id));
  }
  return { linkId: link.id, userId: link.userId };
}

/** GET /v1/game/inventory: имя, баланс и купленные вещи. */
export async function gameInventory(db: Db, userId: number): Promise<GameInventory> {
  const [user] = await db
    .select({ firstName: users.firstName, altyn: users.altyn })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new AppError(401, 'invalid_game_token');
  const rows = await db
    .select({
      id: items.id,
      kk: words.kk,
      ru: words.ru,
      category: items.category,
      slot: items.slot,
      image_url: words.imageUrl,
      equipped: userItems.equipped,
    })
    .from(userItems)
    .innerJoin(items, eq(items.id, userItems.itemId))
    .innerJoin(words, eq(words.id, items.wordId))
    .where(eq(userItems.userId, userId))
    .orderBy(asc(items.category), asc(items.id));
  return {
    first_name: user.firstName,
    altyn: user.altyn,
    items: rows.map((r) => ({ ...r, key: itemArtKey(r.kk, r.category), set: null, rarity: null })),
  };
}

export async function revokeLinkById(db: Db, linkId: number, now = new Date()) {
  await db
    .update(gameLinks)
    .set({ revokedAt: now })
    .where(and(eq(gameLinks.id, linkId), isNull(gameLinks.revokedAt)));
  return { ok: true as const };
}

/** GET /v1/game/links (миниапп): активные связанные устройства. */
export async function listGameLinks(db: Db, userId: number) {
  const rows = await db
    .select()
    .from(gameLinks)
    .where(and(eq(gameLinks.userId, userId), isNull(gameLinks.revokedAt)))
    .orderBy(desc(gameLinks.createdAt));
  return {
    links: rows.map((l) => ({
      id: l.id,
      created_at: l.createdAt.toISOString(),
      last_seen_at: l.lastSeenAt?.toISOString() ?? null,
    })),
  };
}

/** DELETE /v1/game/links/:id (миниапп): отвязать своё устройство. */
export async function revokeUserLink(db: Db, userId: number, linkId: number, now = new Date()) {
  const [row] = await db
    .update(gameLinks)
    .set({ revokedAt: now })
    .where(and(eq(gameLinks.id, linkId), eq(gameLinks.userId, userId), isNull(gameLinks.revokedAt)))
    .returning({ id: gameLinks.id });
  if (!row) throw notFound('link_not_found');
  return { ok: true as const };
}
