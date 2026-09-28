import type { InvitationStatus, NotificationType, UserId } from '../domain';

export type InvitationAction =
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'reschedule'; proposedAt: Date }
  | { type: 'acceptProposal' }
  | { type: 'cancel' };

export type InvitationActionType = InvitationAction['type'];

export interface InvitationState {
  fromUser: UserId;
  toUser: UserId;
  status: InvitationStatus;
  startsAt: Date;
  proposedAt: Date | null;
}

export interface TransitionChanges {
  status: InvitationStatus;
  startsAt?: Date;
  proposedAt?: Date | null;
}

export type TransitionResult =
  | { ok: true; changes: TransitionChanges; notification: NotificationType; isResponse: boolean }
  | { ok: false; code: 'forbidden' | 'invalid'; error: string; fields?: Record<string, string> };

const FORBIDDEN: TransitionResult = { ok: false, code: 'forbidden', error: 'Nu poti face asta pentru invitatia asta.' };

function invalid(error: string, fields?: Record<string, string>): TransitionResult {
  return fields ? { ok: false, code: 'invalid', error, fields } : { ok: false, code: 'invalid', error };
}

function allow(changes: TransitionChanges, notification: NotificationType, isResponse: boolean): TransitionResult {
  return { ok: true, changes, notification, isResponse };
}

/** Singura sursa de adevar pentru ce se poate face cu o invitatie. Actorul vine din sesiune. */
export function transition(
  inv: InvitationState,
  actor: UserId,
  action: InvitationAction,
  now: Date,
): TransitionResult {
  const isFuture = (date: Date) => date.getTime() > now.getTime();

  switch (action.type) {
    case 'accept':
    case 'decline':
    case 'reschedule': {
      if (actor !== inv.toUser) return FORBIDDEN;
      if (inv.status !== 'pending') return invalid('Ai raspuns deja la invitatia asta.');
      if (!isFuture(inv.startsAt)) return invalid('Data invitatiei a trecut.');
      if (action.type === 'accept') return allow({ status: 'accepted' }, 'invite_response', true);
      if (action.type === 'decline') return allow({ status: 'declined' }, 'invite_response', true);
      if (!isFuture(action.proposedAt)) {
        return invalid('Verifica ora propusa.', { proposedAt: 'Alege o ora din viitor' });
      }
      return allow({ status: 'reschedule', proposedAt: action.proposedAt }, 'invite_response', true);
    }
    case 'acceptProposal': {
      if (actor !== inv.fromUser) return FORBIDDEN;
      if (inv.status !== 'reschedule' || !inv.proposedAt) return invalid('Nu exista o ora propusa.');
      if (!isFuture(inv.proposedAt)) return invalid('Ora propusa a trecut deja.');
      return allow({ status: 'accepted', startsAt: inv.proposedAt, proposedAt: null }, 'reschedule_accepted', false);
    }
    case 'cancel': {
      if (actor !== inv.fromUser) return FORBIDDEN;
      const cancellable =
        inv.status === 'pending' || inv.status === 'reschedule' || (inv.status === 'accepted' && isFuture(inv.startsAt));
      if (!cancellable) return invalid('Invitatia nu mai poate fi anulata.');
      return allow({ status: 'cancelled' }, 'invite_cancelled', false);
    }
  }
}

export function canPerform(inv: InvitationState, actor: UserId, type: InvitationActionType, now: Date): boolean {
  const action: InvitationAction =
    type === 'reschedule' ? { type, proposedAt: new Date(now.getTime() + 60 * 60 * 1000) } : { type };
  return transition(inv, actor, action, now).ok;
}
