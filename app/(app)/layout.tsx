import type { ReactNode } from 'react';
import AppHeader, { buildNav } from '@/components/AppHeader';
import SceneRoot from '@/components/scene/SceneRoot';
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { countUnread } from '@/lib/notifications/queries';
import { log, errorInfo } from '@/lib/log';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireSession();
  // Un esec al bazei de date nu trebuie sa strice paginile care nu au nevoie de date: afisam fara badge.
  let unread = 0;
  try {
    unread = await countUnread(getDb(), me);
  } catch (err) {
    log('error', 'unread_count_failed', errorInfo(err));
  }
  return (
    <>
      <SceneRoot />
      <div className="app-shell">
        <AppHeader name={displayName(me)} items={buildNav(unread)} />
        <main className="page">{children}</main>
      </div>
    </>
  );
}
