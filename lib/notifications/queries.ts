import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { invitations, notifications } from '../db/schema';
import type { InvitationStatus, NotificationType, UserId } from '../domain';

export async function countUnread(db: Db, user: UserId): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.recipient, user), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  invitationId: string | null;
  title: string | null;
  status: InvitationStatus | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(db: Db, user: UserId, limit = 100): Promise<NotificationView[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      invitationId: notifications.invitationId,
      // Titlul se ia din invitatie (nu se schimba), dar statusul e cel salvat la momentul
      // notificarii - invitatia poate fi intr-o alta stare acum.
      title: invitations.title,
      status: notifications.invitationStatus,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(invitations, eq(notifications.invitationId, invitations.id))
    .where(eq(notifications.recipient, user))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function markAllRead(db: Db, user: UserId, now: Date): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.recipient, user), isNull(notifications.readAt)));
}

export async function markReadForInvitation(db: Db, user: UserId, invitationId: string, now: Date): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(eq(notifications.recipient, user), eq(notifications.invitationId, invitationId), isNull(notifications.readAt)),
    );
}
