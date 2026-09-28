import { and, eq } from 'drizzle-orm';
import { affectedRows, type Db } from '../db/client';
import { isTxConflict } from '../db/errors';
import { ideas, invitations } from '../db/schema';
import { otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { InvitationInput } from '../validation';
import { insertNotification } from '../notifications/create';
import type { NotificationEvent } from '../notifications/email';
import { getInvitation } from './queries';
import { isTooFarInFuture, transition, type InvitationAction } from './state-machine';

const CONCURRENT_UPDATE_ERROR = 'Invitatia s-a schimbat intre timp. Reincarca pagina.';

/** Aruncat in interiorul tranzactiei ca sa forteze rollback-ul cand update-ul nu a afectat niciun rand. */
class StaleTransitionError extends Error {}

export async function createInvitation(
  db: Db,
  actor: UserId,
  input: InvitationInput,
  now: Date,
): Promise<Result<{ id: string; event: NotificationEvent }>> {
  if (input.startsAt.getTime() <= now.getTime()) {
    return failure('invalid', 'Verifica campurile marcate.', { startsAt: 'Alege o data din viitor' });
  }
  if (isTooFarInFuture(input.startsAt, now)) {
    return failure('invalid', 'Verifica campurile marcate.', { startsAt: 'Alege o data in urmatorii 2 ani' });
  }
  if (input.ideaId) {
    const [idea] = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, input.ideaId)).limit(1);
    if (!idea) return failure('invalid', 'Ideea nu mai exista.');
  }

  const id = newId();
  const toUser = otherUser(actor);
  await db.transaction(async (tx) => {
    await tx.insert(invitations).values({
      id,
      fromUser: actor,
      toUser,
      title: input.title,
      message: input.message,
      location: input.location,
      startsAt: input.startsAt,
      dressCode: input.dressCode,
      theme: input.theme,
      status: 'pending',
      proposedAt: null,
      responseNote: null,
      ideaId: input.ideaId,
      createdAt: now,
      updatedAt: now,
    });
    await insertNotification(tx, { recipient: toUser, type: 'invite_new', invitationId: id, invitationStatus: 'pending', now });
  });

  return ok({ id, event: { recipient: toUser, actor, type: 'invite_new', invitationId: id, title: input.title } });
}

export async function applyInvitationAction(
  db: Db,
  actor: UserId,
  invitationId: string,
  action: InvitationAction,
  now: Date,
  note: string | null = null,
): Promise<Result<{ event: NotificationEvent }>> {
  const inv = await getInvitation(db, invitationId);
  if (!inv) return failure('not_found', 'Invitatia nu exista.');

  const t = transition(inv, actor, action, now);
  if (!t.ok) return failure(t.code, t.error, t.fields);

  const recipient = otherUser(actor);

  try {
    await db.transaction(async (tx) => {
      const updateResult = await tx
        .update(invitations)
        // Garda de mai jos se bazeaza pe faptul ca orice tranzitie schimba status-ul
        // (nu exista tranzitii "de la pending la pending"): un rezultat cu 0 randuri
        // afectate inseamna neaparat ca altcineva a schimbat deja invitatia.
        .set({ ...t.changes, ...(t.isResponse ? { responseNote: note } : {}), updatedAt: now })
        // Conditia pe status previne aplicarea unei tranzitii peste o stare schimbata intre timp.
        .where(and(eq(invitations.id, inv.id), eq(invitations.status, inv.status)));

      if (affectedRows(updateResult) === 0) {
        // O alta cerere a schimbat deja statusul intre citire si acest update: anulam
        // tranzactia ca sa nu inseram notificarea/emailul pentru o actiune care nu s-a
        // aplicat de fapt.
        throw new StaleTransitionError();
      }

      await insertNotification(tx, {
        recipient,
        type: t.notification,
        invitationId: inv.id,
        invitationStatus: t.changes.status,
        now,
      });
    });
  } catch (err) {
    // StaleTransitionError = am detectat noi conflictul (0 randuri afectate). isTxConflict
    // acopera cazul in care TiDB il detecteaza el insusi si arunca inainte sa apucam sa citim
    // rezultatul (write conflict / deadlock intr-o tranzactie optimista concurenta).
    if (err instanceof StaleTransitionError || isTxConflict(err)) {
      return failure('invalid', CONCURRENT_UPDATE_ERROR);
    }
    throw err;
  }

  return ok({
    event: {
      recipient,
      actor,
      type: t.notification,
      invitationId: inv.id,
      title: inv.title,
      status: t.changes.status,
    },
  });
}
