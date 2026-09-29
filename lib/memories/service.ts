import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { isDuplicateKey, isTxConflict } from '../db/errors';
import { memories, type InvitationRow } from '../db/schema';
import { otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { MemoryInput } from '../validation';
import { getInvitation } from '../invitations/queries';
import { insertNotification } from '../notifications/create';

export function canHaveMemories(inv: Pick<InvitationRow, 'status' | 'startsAt'>, now: Date): boolean {
  return inv.status === 'accepted' && inv.startsAt.getTime() <= now.getTime();
}

async function findExistingId(db: Db, invitationId: string, actor: UserId): Promise<string | null> {
  const [existing] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.invitationId, invitationId), eq(memories.author, actor)))
    .limit(1);
  return existing?.id ?? null;
}

async function updateMemory(db: Db, memoryId: string, input: MemoryInput, now: Date): Promise<void> {
  await db
    .update(memories)
    .set({ note: input.note, rating: input.rating, updatedAt: now })
    .where(eq(memories.id, memoryId));
}

export async function saveMemory(
  db: Db,
  actor: UserId,
  invitationId: string,
  input: MemoryInput,
  now: Date,
): Promise<Result<{ memoryId: string; created: boolean }>> {
  const inv = await getInvitation(db, invitationId);
  if (!inv) return failure('not_found', 'Invitatia nu exista.');
  if (!canHaveMemories(inv, now)) return failure('invalid', 'Poti scrie amintiri doar dupa un date acceptat.');

  const existingId = await findExistingId(db, inv.id, actor);
  if (existingId) {
    await updateMemory(db, existingId, input, now);
    return ok({ memoryId: existingId, created: false });
  }

  const id = newId();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(memories).values({
        id,
        invitationId: inv.id,
        author: actor,
        note: input.note,
        rating: input.rating,
        createdAt: now,
        updatedAt: now,
      });
      await insertNotification(tx, { recipient: otherUser(actor), type: 'memory_added', invitationId: inv.id, now });
    });
  } catch (err) {
    // Salvare dubla concurenta: UNIQUE (invitation_id, author) a respins INSERT-ul (sau tranzactia a
    // avut conflict de scriere); refacem ca update daca celalalt request a creat deja randul.
    if (!isDuplicateKey(err) && !isTxConflict(err)) throw err;
    const winnerId = await findExistingId(db, inv.id, actor);
    if (!winnerId) throw err;
    await updateMemory(db, winnerId, input, now);
    return ok({ memoryId: winnerId, created: false });
  }
  return ok({ memoryId: id, created: true });
}
