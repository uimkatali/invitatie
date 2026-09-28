import type { ReactNode } from 'react';
import AppHeader, { buildNav } from '@/components/AppHeader';
import SkyBackground from '@/components/SkyBackground';
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { countUnread } from '@/lib/notifications/queries';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireSession();
  const unread = await countUnread(getDb(), me);
  return (
    <>
      <SkyBackground theme="amandoua" />
      <div className="app-shell">
        <AppHeader name={displayName(me)} items={buildNav(unread)} />
        <main className="page">{children}</main>
      </div>
    </>
  );
}
