import Link from 'next/link';
import type { InvitationRow } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { formatDateTimeRo } from '@/lib/time';
import StatusPill from './StatusPill';

type CardInvitation = Pick<
  InvitationRow,
  'id' | 'title' | 'location' | 'startsAt' | 'status' | 'fromUser' | 'toUser' | 'proposedAt'
>;

interface InvitationCardProps {
  invitation: CardInvitation;
  me: UserId;
  names: Record<UserId, string>;
}

export default function InvitationCard({ invitation, me, names }: InvitationCardProps) {
  const direction =
    invitation.fromUser === me ? `Pentru ${names[invitation.toUser]}` : `De la ${names[invitation.fromUser]}`;
  return (
    <Link href={`/invitatii/${invitation.id}`} className="card invitation-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">{direction}</span>
        <StatusPill status={invitation.status} />
      </div>
      <h3>{invitation.title}</h3>
      <p className="muted">{formatDateTimeRo(invitation.startsAt)}</p>
      <p className="muted">{invitation.location}</p>
      {invitation.status === 'reschedule' && invitation.proposedAt && (
        <p>Ora propusa: {formatDateTimeRo(invitation.proposedAt)}</p>
      )}
    </Link>
  );
}
