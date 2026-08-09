'use client';

import { ADMIN_TABS, useAdminTab } from './tab-context';
import ContentTab from '../../components/admin/ContentTab';
import DateTab from '../../components/admin/DateTab';
import ThemeTab from '../../components/admin/ThemeTab';
import MediaTab from '../../components/admin/MediaTab';
import EmailTab from '../../components/admin/EmailTab';

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
      {activeTab === 'email' && <EmailTab />}
    </section>
  );
}
