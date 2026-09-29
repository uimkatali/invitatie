import type { Db } from '@/lib/db/client';
import { invitations, memories } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { newId } from '@/lib/ids';

type InvitationInsert = typeof invitations.$inferInsert;

/** Invitatie acceptata, cu data in trecut (deci permite amintiri). */
export async function seedInvitation(db: Db, over: Partial<InvitationInsert> = {}): Promise<string> {
  const id = newId();
  const created = new Date('2026-09-01T10:00:00Z');
  await db.insert(invitations).values({
    id,
    fromUser: 'el',
    toUser: 'ea',
    title: 'Cina',
    message: 'Te astept',
    location: 'Acasa',
    startsAt: new Date('2026-09-10T17:00:00Z'),
    dressCode: null,
    theme: 'amandoua',
    status: 'accepted',
    proposedAt: null,
    responseNote: null,
    ideaId: null,
    createdAt: created,
    updatedAt: created,
    ...over,
  });
  return id;
}

export async function seedMemory(db: Db, invitationId: string, author: UserId): Promise<string> {
  const id = newId();
  const now = new Date('2026-09-11T10:00:00Z');
  await db.insert(memories).values({ id, invitationId, author, note: 'Frumos', rating: 5, createdAt: now, updatedAt: now });
  return id;
}
