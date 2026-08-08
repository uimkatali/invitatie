'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export const ADMIN_TABS = [
  { id: 'continut', label: 'Continut' },
  { id: 'data', label: 'Data & ora' },
  { id: 'tema', label: 'Tema 3D' },
  { id: 'media', label: 'Media' },
  { id: 'email', label: 'Trimite email' },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]['id'];

interface AdminTabContextValue {
  activeTab: AdminTabId;
  setActiveTab: (tab: AdminTabId) => void;
}

const AdminTabContext = createContext<AdminTabContextValue | null>(null);

// Holds which admin dashboard tab is selected. Deliberately client-side-only
// state (no routing per tab, per the plan) so the nav (in the layout) and the
// dashboard content (in the page) can share selection without a URL param.
export function AdminTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTabId>('continut');

  return (
    <AdminTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AdminTabContext.Provider>
  );
}

export function useAdminTab(): AdminTabContextValue {
  const ctx = useContext(AdminTabContext);
  if (!ctx) {
    throw new Error('useAdminTab must be used within an AdminTabProvider');
  }
  return ctx;
}
