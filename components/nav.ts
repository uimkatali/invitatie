export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function buildNav(unread: number): NavItem[] {
  return [
    { href: '/', label: 'Acasa' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/idei', label: 'Idei' },
    { href: '/invitatii/noua', label: 'Invitatie noua' },
    { href: '/notificari', label: 'Notificari', badge: unread },
  ];
}

/** Linkul curent: acasa doar pe calea exacta, restul si pe subcai (dar nu pe prefixe partiale). */
export function isActiveLink(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Suma notificarilor necitite din toate linkurile (afisata pe butonul de meniu cand panoul e inchis). */
export function totalUnread(items: NavItem[]): number {
  return items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
}
