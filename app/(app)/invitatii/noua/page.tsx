import { requireSession } from '@/lib/auth/require-session';
import { MAX_FUTURE_MS } from '@/lib/invitations/state-machine';
import { toLocalInputValue } from '@/lib/time';
import InvitationForm, { type InvitationDefaults } from './InvitationForm';

export default async function NewInvitationPage() {
  await requireSession();
  const defaults: InvitationDefaults = { title: '', message: '', ideaId: '' };
  const now = new Date();
  return (
    <div className="stack">
      <h1>Invitatie noua</h1>
      <InvitationForm
        defaults={defaults}
        minDateTime={toLocalInputValue(now)}
        maxDateTime={toLocalInputValue(new Date(now.getTime() + MAX_FUTURE_MS))}
      />
    </div>
  );
}
