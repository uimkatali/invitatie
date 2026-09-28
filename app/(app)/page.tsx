import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';

export default async function DashboardPage() {
  const me = await requireSession();
  return (
    <section className="card stack">
      <p className="eyebrow">Salut</p>
      <h1>{displayName(me)}</h1>
      <p className="muted">Aici vor aparea dateurile voastre.</p>
    </section>
  );
}
