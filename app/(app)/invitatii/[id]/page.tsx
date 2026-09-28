import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { getInvitation } from '@/lib/invitations/queries';
import { canPerform } from '@/lib/invitations/state-machine';
import { markReadForInvitation } from '@/lib/notifications/queries';
import { toLocalInputValue } from '@/lib/time';
import InvitationDetails from './InvitationDetails';
import ResponsePanel from './ResponsePanel';
import CreatorActions from './CreatorActions';
import { respondAction, acceptProposalAction, cancelInvitationAction } from './actions';

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSession();
  const { id } = await params;
  const db = getDb();
  const invitation = await getInvitation(db, id);
  if (!invitation) notFound();

  const now = new Date();
  await markReadForInvitation(db, me, invitation.id, now);
  const names = displayNames();
  const canRespond = canPerform(invitation, me, 'accept', now);

  return (
    <div className="stack">
      <InvitationDetails
        invitation={invitation}
        me={me}
        names={names}
        isFuture={invitation.startsAt.getTime() > now.getTime()}
      />
      {canRespond && (
        <ResponsePanel action={respondAction.bind(null, invitation.id)} minDateTime={toLocalInputValue(now)} />
      )}
      <CreatorActions
        acceptProposal={
          canPerform(invitation, me, 'acceptProposal', now) ? acceptProposalAction.bind(null, invitation.id) : null
        }
        cancel={canPerform(invitation, me, 'cancel', now) ? cancelInvitationAction.bind(null, invitation.id) : null}
      />
    </div>
  );
}
