'use client';

import { ADMIN_TABS, useAdminTab, type AdminTabId } from './tab-context';

// Tab content components (ContentTab, DateTab, ThemeTab, MediaTab, EmailTab)
// land in later tasks (8-12). Until then each tab renders placeholder copy
// so the shell and navigation can be verified end-to-end on their own.
const PLACEHOLDER_COPY: Record<AdminTabId, string> = {
  continut: 'Editarea textelor site-ului (titluri, pasi de dezvaluire, email) va fi disponibila aici.',
  data: 'Setarea datei si orei evenimentului va fi disponibila aici.',
  tema: 'Alegerea uneia dintre cele 15 teme 3D va fi disponibila aici.',
  media: 'Incarcarea si asignarea pozelor/video-urilor pe zone va fi disponibila aici.',
  email: 'Trimiterea invitatiei prin email va fi disponibila aici.',
};

export default function AdminDashboardPage() {
  const { activeTab } = useAdminTab();
  const tab = ADMIN_TABS.find((entry) => entry.id === activeTab);

  return (
    <section className="admin-panel">
      <h1 className="admin-panel-title">{tab?.label}</h1>
      <p className="admin-panel-placeholder">{PLACEHOLDER_COPY[activeTab]}</p>
    </section>
  );
}
