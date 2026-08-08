'use client';

import { ADMIN_TABS, useAdminTab } from './tab-context';

export default function AdminNav() {
  const { activeTab, setActiveTab } = useAdminTab();

  return (
    <nav className="admin-nav" aria-label="Sectiuni panou admin">
      {ADMIN_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`admin-nav-tab${tab.id === activeTab ? ' is-active' : ''}`}
          aria-current={tab.id === activeTab ? 'page' : undefined}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
