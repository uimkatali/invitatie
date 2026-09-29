import Link from 'next/link';
import { notFound } from 'next/navigation';
import RefreshOnMount from '@/components/RefreshOnMount';
import SceneController from '@/components/scene/SceneController';
import InvitationExperience from '@/components/scene/InvitationExperience';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { getInvitation } from '@/lib/invitations/queries';
import { MAX_FUTURE_MS, canPerform } from '@/lib/invitations/state-machine';
import { listMemories } from '@/lib/memories/queries';
import { canHaveMemories } from '@/lib/memories/service';
import { markReadForInvitation } from '@/lib/notifications/queries';
import { formatDateTimeRo, toLocalInputValue } from '@/lib/time';
import { flashMessage } from './flash';
import InvitationDetails from './InvitationDetails';
import ResponsePanel from './ResponsePanel';
import CreatorActions from './CreatorActions';
import MemoriesSection from './MemoriesSection';
import { respondAction, acceptProposalAction, cancelInvitationAction } from './actions';

interface InvitationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revezi?: string; mesaj?: string | string[] }>;
}

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const me = await requireSession();
  const [{ id }, { revezi, mesaj }] = await Promise.all([params, searchParams]);
  const flash = flashMessage(mesaj);
  const db = getDb();
  const invitation = await getInvitation(db, id);
  if (!invitation) notFound();

  const now = new Date();
  // Atentie: marcarea ca citite se face aici, la randarea GET a paginii. Un prefetch agresiv al
  // link-urilor catre aceasta pagina (prefetch={true}) ar marca notificarile citite la simplul hover.
  const markedRead = await markReadForInvitation(db, me, invitation.id, now);
  // Layout-ul nu se re-randeaza la navigarea client: cerem un refresh ca badge-ul sa se actualizeze.
  // Dupa refresh markedRead e 0 si componenta dispare; restul arborelui ramane montat.
  const refresh = markedRead > 0 ? <RefreshOnMount /> : null;
  const names = displayNames();
  const isRecipient = invitation.toUser === me;
  const canRespond = canPerform(invitation, me, 'accept', now);
  const replay = revezi === '1' && isRecipient;

  if (canRespond || replay) {
    return (
      <>
        {refresh}
        <InvitationExperience
          theme={invitation.theme}
          invitation={{
            title: invitation.title,
            message: invitation.message,
            location: invitation.location,
            startsAtISO: invitation.startsAt.toISOString(),
            startsAtLabel: formatDateTimeRo(invitation.startsAt),
            dressCode: invitation.dressCode,
            fromName: names[invitation.fromUser],
          }}
        >
          {canRespond ? (
            <ResponsePanel
              action={respondAction.bind(null, invitation.id)}
              minDateTime={toLocalInputValue(now)}
              maxDateTime={toLocalInputValue(new Date(now.getTime() + MAX_FUTURE_MS))}
            />
          ) : (
            <div className="card stack">
              <p>Ai raspuns deja la invitatia asta.</p>
              <Link href={`/invitatii/${invitation.id}`} className="btn btn-primary">
                Inapoi la rezumat
              </Link>
            </div>
          )}
        </InvitationExperience>
      </>
    );
  }

  const memories = canHaveMemories(invitation, now) ? await listMemories(db, invitation.id) : null;

  return (
    <div className="stack">
      {refresh}
      <SceneController theme={invitation.theme} />
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
      {isRecipient && (
        <div className="row">
          <Link href={`/invitatii/${invitation.id}?revezi=1`} className="btn btn-ghost">
            Revezi invitatia
          </Link>
        </div>
      )}
      <CreatorActions
        acceptProposal={
          canPerform(invitation, me, 'acceptProposal', now) ? acceptProposalAction.bind(null, invitation.id) : null
        }
        cancel={canPerform(invitation, me, 'cancel', now) ? cancelInvitationAction.bind(null, invitation.id) : null}
      />
      {memories && <MemoriesSection invitationId={invitation.id} me={me} names={names} memories={memories} />}
    </div>
  );
}
