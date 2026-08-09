'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminTabProvider } from './tab-context';
import { AdminSettingsProvider } from './settings-context';
import AdminNav from './AdminNav';
import LogoutButton from './LogoutButton';

// Shared chrome for /admin/*. The login page lives inside this same route
// tree (app/admin/login/page.tsx) but must NOT get the authenticated header/
// nav/logout chrome, so this component checks the pathname and renders a
// bare shell for it instead.
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    return <div className="admin-shell admin-shell--bare">{children}</div>;
  }

  return (
    <AdminTabProvider>
      <AdminSettingsProvider>
        <div className="admin-shell">
          <header className="admin-header">
            <div className="admin-header-title">
              <span className="admin-header-mark">//</span>
              Panou admin
            </div>
            <LogoutButton />
          </header>
          <AdminNav />
          <main className="admin-main">{children}</main>
        </div>
      </AdminSettingsProvider>
    </AdminTabProvider>
  );
}
