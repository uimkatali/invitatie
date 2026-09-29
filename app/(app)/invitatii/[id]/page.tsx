import { notFound } from 'next/navigation';
import RefreshOnMount from '@/components/RefreshOnMount';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { getInvitation } from '@/lib/invitations/queries';
import { MAX_FUTURE_MS, canPerform } from '@/lib/invitations/state-machine';
import { markReadForInvitation } from '@/lib/notifications/queries';
import { toLocalInputValue } from '@/lib/time';
import { flashMessage } from './flash';
import InvitationDetails from './InvitationDetails';
import ResponsePanel from './ResponsePanel';
import CreatorActions from './CreatorActions';
import { respondAction, acceptProposalAction, cancelInvitationAction } from './actions';

interface InvitationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mesaj?: string | string[] }>;
}

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const me = await requireSession();
  const { id } = await params;
  const flash = flashMessage((await searchParams).mesaj);
  const db = getDb();
  const invitation = await getInvitation(db, id);
  if (!invitation) notFound();

  const now = new Date();
  // Atentie: marcarea ca citite se face aici, la randarea GET a paginii. Un prefetch agresiv al
  // link-urilor catre aceasta pagina (prefetch={true}) ar marca notificarile citite la simplul hover.
  const markedRead = await markReadForInvitation(db, me, invitation.id, now);
  const names = displayNames();
  const canRespond = canPerform(invitation, me, 'accept', now);

  return (
    <div className="stack">
      {/* Layout-ul nu se re-randeaza la navigarea client: cerem un refresh ca badge-ul sa se actualizeze. */}
      {markedRead > 0 && <RefreshOnMount />}
      {flash && (
        <p className="form-success" role="status">
          {flash}
        </p>
      )}
      <InvitationDetails
        invitation={invitation}
        me={me}
        names={names}
        isFuture={invitation.startsAt.getTime() > now.getTime()}
      />
      {canRespond && (
        <ResponsePanel
          action={respondAction.bind(null, invitation.id)}
          minDateTime={toLocalInputValue(now)}
          maxDateTime={toLocalInputValue(new Date(now.getTime() + MAX_FUTURE_MS))}
        />
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
