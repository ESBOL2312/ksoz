import { and, eq } from 'drizzle-orm';
import type { TelegramUser } from '../auth/initData.js';
import type { Db } from '../db/client.js';
import { friendships, users, type UserRow } from '../db/schema.js';

const REF_RE = /^ref_(\d{1,15})$/;

/** Находит пользователя или создаёт при первом запросе (с рефералом из start_param). */
export async function getOrCreateUser(
  db: Db,
  tg: TelegramUser,
  startParam: string | null,
): Promise<UserRow> {
  const [existing] = await db.select().from(users).where(eq(users.id, tg.id));
  if (existing) {
    const username = tg.username ?? null;
    if (existing.firstName !== tg.first_name || existing.username !== username) {
      const [updated] = await db
        .update(users)
        .set({ firstName: tg.first_name, username })
        .where(eq(users.id, tg.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  return db.transaction(async (tx) => {
    let referrerId: number | null = null;
    const refId = Number(REF_RE.exec(startParam ?? '')?.[1]);
    if (refId && refId !== tg.id) {
      const [ref] = await tx.select({ id: users.id }).from(users).where(eq(users.id, refId));
      referrerId = ref?.id ?? null;
    }

    const [created] = await tx
      .insert(users)
      .values({
        id: tg.id,
        firstName: tg.first_name,
        username: tg.username ?? null,
        languageCode: tg.language_code ?? null,
        referrerId,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      // параллельный первый запрос уже создал строку
      const [row] = await tx.select().from(users).where(eq(users.id, tg.id));
      return row!;
    }
    if (referrerId !== null) {
      await tx
        .insert(friendships)
        .values([
          { userId: tg.id, friendId: referrerId },
          { userId: referrerId, friendId: tg.id },
        ])
        .onConflictDoNothing();
    }
    return created;
  });
}

export async function areFriends(db: Db, a: number, b: number): Promise<boolean> {
  const rows = await db
    .select({ u: friendships.userId })
    .from(friendships)
    .where(and(eq(friendships.userId, a), eq(friendships.friendId, b)));
  return rows.length > 0;
}
