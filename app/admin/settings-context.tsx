'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SettingsRow } from '../../lib/settings';

interface AdminSettingsContextValue {
  settings: SettingsRow | null;
  setSettings: (update: SettingsRow | ((prev: SettingsRow | null) => SettingsRow | null)) => void;
  loading: boolean;
  loadError: string | null;
  refetch: () => void;
}

const AdminSettingsContext = createContext<AdminSettingsContextValue | null>(null);

// Holds the ONE in-memory copy of the settings row shared by every admin
// tab (ContentTab, DateTab, and future tabs like Tema 3D). Fetched once here
// on mount rather than once per tab, so:
//  - switching tabs (which unmounts the previous tab's component, per
//    app/admin/page.tsx) no longer discards in-progress edits: field
//    changes are written into this shared `settings` state as the user
//    types, not just on save, so remounting a tab just reads the same
//    shared object back.
//  - two tabs can no longer clobber each other's changes with a stale
//    independently-fetched copy on save: every tab reads and writes this
//    single shared object, so a PUT from one tab always includes the other
//    tab's in-progress edits too.
export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          throw new Error('Nu s-au putut incarca setarile.');
        }
        const data: SettingsRow = await response.json();
        if (!cancelled) setSettings(data);
      } catch {
        if (!cancelled) setLoadError('Nu s-au putut incarca setarile. Incearca din nou.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return (
    <AdminSettingsContext.Provider value={{ settings, setSettings, loading, loadError, refetch }}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useSettings(): AdminSettingsContextValue {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within an AdminSettingsProvider');
  }
  return ctx;
}
