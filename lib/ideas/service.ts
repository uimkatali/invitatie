import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { ideas } from '../db/schema';
import { LIMITS, otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { IdeaInput } from '../validation';
import { insertNotification } from '../notifications/create';
import { getIdea, isIdeaUsed } from './queries';

export async function createIdea(db: Db, actor: UserId, input: IdeaInput, now: Date): Promise<Result<{ id: string }>> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(ideas);
  if (n >= LIMITS.maxIdeas) {
    return failure('invalid', `Aveti deja ${LIMITS.maxIdeas} de idei. Stergeti cateva mai vechi.`);
  }
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(ideas).values({ id, author: actor, title: input.title, description: input.description, createdAt: now });
    await insertNotification(tx, { recipient: otherUser(actor), type: 'idea_added', invitationId: null, now });
  });
  return ok({ id });
}

export async function deleteIdea(db: Db, actor: UserId, id: string): Promise<Result> {
  const idea = await getIdea(db, id);
  if (!idea || idea.author !== actor) return failure('not_found', 'Ideea nu exista.');
  if (await isIdeaUsed(db, idea.id)) return failure('invalid', 'Ideea a fost folosita intr-o invitatie.');
  await db.delete(ideas).where(eq(ideas.id, idea.id));
  return ok(undefined);
}
