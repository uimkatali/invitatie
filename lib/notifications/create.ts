import type { DbOrTx } from '../db/client';
import { notifications } from '../db/schema';
import type { InvitationStatus, NotificationType, UserId } from '../domain';
import { newId } from '../ids';

export interface NewNotification {
  recipient: UserId;
  type: NotificationType;
  invitationId: string | null;
  /** Statusul invitatiei in acest moment, ca sa nu se schimbe descrierea daca invitatia evolueaza mai tarziu. */
  invitationStatus?: InvitationStatus | null;
  now: Date;
}

export async function insertNotification(db: DbOrTx, input: NewNotification): Promise<void> {
  await db.insert(notifications).values({
    id: newId(),
    recipient: input.recipient,
    type: input.type,
    invitationId: input.invitationId,
    invitationStatus: input.invitationStatus ?? null,
    readAt: null,
    createdAt: input.now,
  });
}
