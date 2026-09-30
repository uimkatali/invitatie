import { and, asc, eq, gt, gte, lt, ne, or } from 'drizzle-orm';
import type { Db } from '../db/client';
import { invitations, type InvitationRow } from '../db/schema';
import { isUuid } from '../ids';

const CANCELLED_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

/** Toate invitatiile relevante pentru dashboard, intr-un singur query. */
export async function listDashboardInvitations(db: Db, now: Date): Promise<InvitationRow[]> {
  const cutoff = new Date(now.getTime() - CANCELLED_VISIBLE_MS);
  return db
    .select()
    .from(invitations)
    .where(or(ne(invitations.status, 'cancelled'), gt(invitations.updatedAt, cutoff)))
    .orderBy(asc(invitations.startsAt));
}

export async function getInvitation(db: Db, id: string): Promise<InvitationRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return row ?? null;
}

/** Pentru calendar (Faza 3): invitatii ne-anulate intre doua momente. */
export async function listInvitationsBetween(db: Db, from: Date, to: Date): Promise<InvitationRow[]> {
  return db
    .select()
    .from(invitations)
    .where(and(ne(invitations.status, 'cancelled'), gte(invitations.startsAt, from), lt(invitations.startsAt, to)))
    .orderBy(asc(invitations.startsAt));
}
