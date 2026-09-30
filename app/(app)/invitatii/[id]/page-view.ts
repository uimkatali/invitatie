import type { UserId } from '@/lib/domain';
import { canPerform, type InvitationState } from '@/lib/invitations/state-machine';

export type PageViewKind = 'experience-respond' | 'experience-replay' | 'summary';

/** Ce vede utilizatorul: experienta (raspuns sau revedere) sau rezumatul invitatiei. */
export function pageView(invitation: InvitationState, me: UserId, now: Date, revezi: string | undefined): PageViewKind {
  if (canPerform(invitation, me, 'accept', now)) return 'experience-respond';
  if (revezi === '1' && invitation.toUser === me && invitation.status !== 'cancelled') return 'experience-replay';
  return 'summary';
}
