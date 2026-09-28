import Link from 'next/link';
import Countdown from '@/components/Countdown';
import InvitationCard from '@/components/InvitationCard';
import type { InvitationRow } from '@/lib/db/schema';
import { otherUser, type UserId } from '@/lib/domain';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { listDashboardInvitations } from '@/lib/invitations/queries';
import { groupInvitations } from '@/lib/invitations/group';
import { formatDateTimeRo } from '@/lib/time';

interface SectionProps {
  title: string;
  items: InvitationRow[];
  empty?: string;
  me: UserId;
  names: Record<UserId, string>;
}

function InvitationSection({ title, items, empty, me, names }: SectionProps) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="stack" aria-label={title}>
      <h2>{title}</h2>
      {items.length > 0 ? (
        <div className="grid-2">
          {items.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} me={me} names={names} />
          ))}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const me = await requireSession();
  const now = new Date();
  const groups = groupInvitations(await listDashboardInvitations(getDb(), now), me, now);
  const names = displayNames();
  const next = groups.next;

  return (
    <div className="stack">
      <section className="card hero">
        {next ? (
          <>
            <p className="eyebrow">Urmatorul date</p>
            <h1>{next.title}</h1>
            <p>
              {formatDateTimeRo(next.startsAt)} · {next.location}
            </p>
            <Countdown targetISO={next.startsAt.toISOString()} label="Mai sunt" completeLabel="E acum!" />
            <div className="row">
              <Link className="btn btn-primary" href={`/invitatii/${next.id}`}>
                Vezi invitatia
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">Salut, {names[me]}</p>
            <h1>Niciun date planificat</h1>
            <p className="muted">Hai sa schimbam asta.</p>
            <div className="row">
              <Link className="btn btn-primary" href="/invitatii/noua">
                Creeaza o invitatie
              </Link>
            </div>
          </>
        )}
      </section>

      <InvitationSection title="Asteapta raspunsul tau" items={groups.awaitingMe} me={me} names={names} />
      <InvitationSection title="Urmatoare" items={groups.upcoming} me={me} names={names} />
      <InvitationSection
        title={`Asteapta raspuns de la ${names[otherUser(me)]}`}
        items={groups.awaitingOther}
        me={me}
        names={names}
      />
      <InvitationSection title="Istoric" items={groups.history} empty="Inca nu aveti dateuri in istoric." me={me} names={names} />
    </div>
  );
}
