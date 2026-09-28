import Link from 'next/link';
import { logoutAction } from '@/app/(auth)/actions';

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function buildNav(unread: number): NavItem[] {
  return [
    { href: '/', label: 'Acasa' },
    { href: '/invitatii/noua', label: 'Invitatie noua' },
    { href: '/notificari', label: 'Notificari', badge: unread },
  ];
}

interface AppHeaderProps {
  name: string;
  items: NavItem[];
}

export default function AppHeader({ name, items }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link href="/" className="logo">
        Dateurile noastre
      </Link>
      <nav aria-label="Navigare principala">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="nav-link">
            {item.label}
            {item.badge ? (
              <>
                <span className="badge" aria-hidden="true">
                  {item.badge}
                </span>
                <span className="sr-only">{item.badge} necitite</span>
              </>
            ) : null}
          </Link>
        ))}
        <form action={logoutAction}>
          <button type="submit" className="nav-link btn-link" title={`Iesi (${name})`}>
            Iesi
          </button>
        </form>
      </nav>
    </header>
  );
}
