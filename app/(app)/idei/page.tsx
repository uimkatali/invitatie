import Link from 'next/link';
import RefreshOnMount from '@/components/RefreshOnMount';
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { listIdeas } from '@/lib/ideas/queries';
import { markIdeaNotificationsRead } from '@/lib/notifications/queries';
import IdeaForm from './IdeaForm';
import { deleteIdeaAction } from './actions';

export default async function IdeasPage() {
  const me = await requireSession();
  const db = getDb();
  // Marcarea ca citite se face la randarea GET a paginii (ca la invitatie): cine deschide lista a vazut ideile noi.
  // Layout-ul nu se re-randeaza la navigarea client, deci cerem un refresh ca badge-ul sa se actualizeze.
  const [ideas, markedRead] = await Promise.all([listIdeas(db), markIdeaNotificationsRead(db, me, new Date())]);
  const names = displayNames();

  return (
    <div className="stack">
      {markedRead > 0 ? <RefreshOnMount /> : null}
      <h1>Idei de dateuri</h1>
      <IdeaForm />
      {ideas.length === 0 ? (
        <p className="card muted">Nicio idee inca. Scrie prima!</p>
      ) : (
        <ul className="grid-2 idea-list">
          {ideas.map((idea) => (
            <li key={idea.id} className="card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">De la {names[idea.author]}</span>
                {idea.used && <span className="status status-accepted">Folosita</span>}
              </div>
              <h3>{idea.title}</h3>
              {idea.description && <p className="invitation-message">{idea.description}</p>}
              <div className="row">
                {!idea.used && (
                  <Link className="btn btn-primary" href={`/invitatii/noua?idee=${idea.id}`}>
                    Fa din asta o invitatie
                  </Link>
                )}
                {idea.author === me && !idea.used && (
                  <ActionButtonForm
                    action={deleteIdeaAction.bind(null, idea.id)}
                    label="Sterge"
                    variant="danger"
                    confirmText="Stergi ideea?"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
