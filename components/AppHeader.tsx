'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/(auth)/actions';
import { isActiveLink, type NavItem } from './nav';

interface AppHeaderProps {
  name: string;
  items: NavItem[];
}

export default function AppHeader({ name, items }: AppHeaderProps) {
  const pathname = usePathname();
  // Meniul e deschis doar pentru calea la care a fost deschis: la schimbarea rutei se inchide singur.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedAt(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <header className="app-header" ref={headerRef}>
      <Link href="/" className="logo">
        Dateurile noastre
      </Link>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={open ? 'Inchide meniul' : 'Deschide meniul'}
        onClick={() => setOpenedAt(open ? null : pathname)}
      >
        <span className="menu-icon" aria-hidden="true" />
      </button>
      <nav id="main-nav" className={`main-nav${open ? ' is-open' : ''}`} aria-label="Navigare principala">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            aria-current={isActiveLink(pathname, item.href) ? 'page' : undefined}
            onClick={() => setOpenedAt(null)}
          >
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
        <form action={logoutAction} className="nav-logout">
          <button type="submit" className="nav-link btn-link" title={`Iesi (${name})`}>
            Iesi
          </button>
        </form>
      </nav>
    </header>
  );
}
