'use client';

import { ADMIN_TABS, useAdminTab, type AdminTabId } from './tab-context';
import ContentTab from '../../components/admin/ContentTab';
import DateTab from '../../components/admin/DateTab';

// Tab content components for tema/media/email land in later tasks (9-12).
// Until then those tabs render placeholder copy so the shell and navigation
// can be verified end-to-end on their own.
const PLACEHOLDER_COPY: Partial<Record<AdminTabId, string>> = {
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
      {activeTab === 'continut' && <ContentTab />}
      {activeTab === 'data' && <DateTab />}
      {PLACEHOLDER_COPY[activeTab] && (
        <p className="admin-panel-placeholder">{PLACEHOLDER_COPY[activeTab]}</p>
      )}
    </section>
  );
}
