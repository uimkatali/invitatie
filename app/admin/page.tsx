'use client';

import { ADMIN_TABS, useAdminTab, type AdminTabId } from './tab-context';
import ContentTab from '../../components/admin/ContentTab';
import DateTab from '../../components/admin/DateTab';
import ThemeTab from '../../components/admin/ThemeTab';
import MediaTab from '../../components/admin/MediaTab';

// Tab content component for email lands in a later task (11).
// Until then that tab renders placeholder copy so the shell and navigation
// can be verified end-to-end on their own.
const PLACEHOLDER_COPY: Partial<Record<AdminTabId, string>> = {
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
      {activeTab === 'tema' && <ThemeTab />}
      {activeTab === 'media' && <MediaTab />}
      {PLACEHOLDER_COPY[activeTab] && (
        <p className="admin-panel-placeholder">{PLACEHOLDER_COPY[activeTab]}</p>
      )}
    </section>
  );
}
