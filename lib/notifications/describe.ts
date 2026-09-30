import type { InvitationStatus, NotificationType } from '../domain';

export interface DescribeInput {
  type: NotificationType;
  actorName: string;
  title: string | null;
  status?: InvitationStatus;
}

export function describeNotification({ type, actorName, title, status }: DescribeInput): string {
  const quoted = title ? `"${title}"` : 'o invitatie';
  switch (type) {
    case 'invite_new':
      return `${actorName} te-a invitat la ${quoted}`;
    case 'invite_response':
      if (status === 'accepted') return `${actorName} a acceptat invitatia ${quoted}`;
      if (status === 'declined') return `${actorName} a refuzat invitatia ${quoted}`;
      if (status === 'reschedule') return `${actorName} propune alta ora pentru ${quoted}`;
      return `${actorName} a raspuns la invitatia ${quoted}`;
    case 'reschedule_accepted':
      return `${actorName} a acceptat ora propusa pentru ${quoted}`;
    case 'invite_cancelled':
      return `${actorName} a anulat invitatia ${quoted}`;
    case 'memory_added':
      return `${actorName} a scris o amintire despre ${quoted}`;
    case 'idea_added':
      return `${actorName} a adaugat o idee noua`;
  }
}

export function notificationHref(type: NotificationType, invitationId: string | null): string {
  if (invitationId) return `/invitatii/${invitationId}`;
  return type === 'idea_added' ? '/idei' : '/notificari';
}
