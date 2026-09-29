import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { getIdea } from '@/lib/ideas/queries';
import { MAX_FUTURE_MS } from '@/lib/invitations/state-machine';
import { toLocalInputValue } from '@/lib/time';
import InvitationForm, { type InvitationDefaults } from './InvitationForm';

export default async function NewInvitationPage({ searchParams }: { searchParams: Promise<{ idee?: string }> }) {
  await requireSession();
  const { idee } = await searchParams;
  // getIdea valideaza parametrul (isUuid) si intoarce null pentru orice valoare invalida.
  const idea = typeof idee === 'string' && idee ? await getIdea(getDb(), idee) : null;
  const now = new Date();
  const defaults: InvitationDefaults = idea
    ? { title: idea.title, message: idea.description ?? '', ideaId: idea.id }
    : { title: '', message: '', ideaId: '' };

  return (
    <div className="stack">
      <h1>Invitatie noua</h1>
      {idea && <p className="muted">Pornita din ideea &bdquo;{idea.title}&rdquo;.</p>}
      <InvitationForm
        defaults={defaults}
        minDateTime={toLocalInputValue(now)}
        maxDateTime={toLocalInputValue(new Date(now.getTime() + MAX_FUTURE_MS))}
      />
    </div>
  );
}
