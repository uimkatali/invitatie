import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';
import type { Db } from '../db/client';
import { ideas, invitations, type IdeaRow } from '../db/schema';
import { isUuid } from '../ids';

export interface IdeaView extends IdeaRow {
  used: boolean;
}

async function usedIdeaIds(db: Db): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ ideaId: invitations.ideaId })
    .from(invitations)
    .where(and(isNotNull(invitations.ideaId), ne(invitations.status, 'cancelled')));
  return new Set(rows.map((r) => r.ideaId).filter((id): id is string => id !== null));
}

export async function listIdeas(db: Db): Promise<IdeaView[]> {
  const [rows, used] = await Promise.all([db.select().from(ideas).orderBy(desc(ideas.createdAt)), usedIdeaIds(db)]);
  return rows.map((row) => ({ ...row, used: used.has(row.id) }));
}

export async function getIdea(db: Db, id: string): Promise<IdeaRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
  return row ?? null;
}

export async function isIdeaUsed(db: Db, id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.ideaId, id), ne(invitations.status, 'cancelled')))
    .limit(1);
  return Boolean(row);
}
