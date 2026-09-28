import Countdown from '@/components/Countdown';
import StatusPill from '@/components/StatusPill';
import type { InvitationRow } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { formatDateTimeRo } from '@/lib/time';

interface InvitationDetailsProps {
  invitation: InvitationRow;
  me: UserId;
  names: Record<UserId, string>;
  isFuture: boolean;
}

export default function InvitationDetails({ invitation, me, names, isFuture }: InvitationDetailsProps) {
  const heading =
    invitation.fromUser === me
      ? `Invitatia ta pentru ${names[invitation.toUser]}`
      : `Invitatie de la ${names[invitation.fromUser]}`;
  return (
    <article className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow">{heading}</p>
        <StatusPill status={invitation.status} />
      </div>
      <h1>{invitation.title}</h1>
      <p className="invitation-message">{invitation.message}</p>
      <dl className="details-list">
        <div>
          <dt>Unde</dt>
          <dd>{invitation.location}</dd>
        </div>
        <div>
          <dt>Cand</dt>
          <dd>{formatDateTimeRo(invitation.startsAt)}</dd>
        </div>
        {invitation.dressCode && (
          <div>
            <dt>Dress code</dt>
            <dd>{invitation.dressCode}</dd>
          </div>
        )}
        {invitation.status === 'reschedule' && invitation.proposedAt && (
          <div>
            <dt>Ora propusa</dt>
            <dd>{formatDateTimeRo(invitation.proposedAt)}</dd>
          </div>
        )}
        {invitation.responseNote && (
          <div>
            <dt>Mesaj la raspuns</dt>
            <dd>{invitation.responseNote}</dd>
          </div>
        )}
      </dl>
      {invitation.status === 'accepted' && isFuture && (
        <Countdown targetISO={invitation.startsAt.toISOString()} label="Mai sunt" completeLabel="E acum!" />
      )}
    </article>
  );
}
