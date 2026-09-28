import type { ReactNode } from 'react';
import AppHeader, { BASE_NAV } from '@/components/AppHeader';
import SkyBackground from '@/components/SkyBackground';
import { requireSession } from '@/lib/auth/require-session';
import { displayName } from '@/lib/auth/display-names';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireSession();
  return (
    <>
      <SkyBackground theme="amandoua" />
      <div className="app-shell">
        <AppHeader name={displayName(me)} items={BASE_NAV} />
        <main className="page">{children}</main>
      </div>
    </>
  );
}
