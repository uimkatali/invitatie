import { requireSession } from '@/lib/auth/require-session';
import { toLocalInputValue } from '@/lib/time';
import InvitationForm, { type InvitationDefaults } from './InvitationForm';

export default async function NewInvitationPage() {
  await requireSession();
  const defaults: InvitationDefaults = { title: '', message: '', ideaId: '' };
  return (
    <div className="stack">
      <h1>Invitatie noua</h1>
      <InvitationForm defaults={defaults} minDateTime={toLocalInputValue(new Date())} />
    </div>
  );
}
