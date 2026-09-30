import Link from 'next/link';
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { otherUser } from '@/lib/domain';
import { listNotifications } from '@/lib/notifications/queries';
import { describeNotification, notificationHref } from '@/lib/notifications/describe';
import { formatShortRo } from '@/lib/time';
import { markAllReadAction } from './actions';

export default async function NotificationsPage() {
  const me = await requireSession();
  const list = await listNotifications(getDb(), me);
  const actorName = displayNames()[otherUser(me)];
  const hasUnread = list.some((n) => !n.readAt);

  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Notificari</h1>
        {hasUnread && <ActionButtonForm action={markAllReadAction} label="Marcheaza tot citit" />}
      </div>
      {list.length === 0 ? (
        <p className="card muted">Nicio notificare inca.</p>
      ) : (
        <ul className="notification-list">
          {list.map((n) => (
            <li key={n.id} className={`card notification${n.readAt ? '' : ' unread'}`}>
              <Link href={notificationHref(n.type, n.invitationId)}>
                {describeNotification({ type: n.type, actorName, title: n.title, status: n.status ?? undefined })}
              </Link>
              <time className="muted" dateTime={n.createdAt.toISOString()}>
                {formatShortRo(n.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
