'use client';

import { useEffect, useState } from 'react';
import type { SettingsRow } from '../../lib/settings';

// Matches e.g. "2026-07-25T13:00:00+03:00" -> date, time (HH:MM) and offset
// ("+03:00" or "Z"). We deliberately keep the original offset around instead
// of letting the browser reinterpret the instant in its own timezone: an
// admin in a different timezone than the event should still see and edit
// the wall-clock time that was stored, and save it back with that same
// offset untouched.
const ISO_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

function parseIso(iso: string): { localValue: string; offset: string } {
  const match = ISO_PATTERN.exec(iso);
  if (!match) {
    return { localValue: '', offset: '+00:00' };
  }
  const [, datePart, timePart, offsetPart] = match;
  return { localValue: `${datePart}T${timePart}`, offset: offsetPart ?? '+00:00' };
}

function toIsoWithOffset(localValue: string, offset: string): string {
  // localValue is "YYYY-MM-DDTHH:MM" from the datetime-local input.
  return `${localValue}:00${offset === 'Z' ? 'Z' : offset}`;
}

export default function DateTab() {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [localValue, setLocalValue] = useState('');
  const [offset, setOffset] = useState('+00:00');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        if (cancelled) return;
        setSettings(data);
        const parsed = parseIso(data.eventDateIso);
        setLocalValue(parsed.localValue);
        setOffset(parsed.offset);
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
  }, []);

  async function handleSave() {
    if (!settings || !localValue) return;
    setSaving(true);
    setSaveErrors(null);
    setSaveSuccess(false);

    const updated: SettingsRow = { ...settings, eventDateIso: toIsoWithOffset(localValue, offset) };

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSaveErrors(Array.isArray(data.errors) ? data.errors : ['Salvarea a esuat.']);
        return;
      }

      setSettings(updated);
      setSaveSuccess(true);
    } catch {
      setSaveErrors(['Nu s-a putut contacta serverul. Incearca din nou.']);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-panel-placeholder">Se incarca setarile...</p>;
  }

  if (loadError || !settings) {
    return (
      <p className="admin-panel-placeholder admin-form-error">
        {loadError ?? 'Setarile nu sunt disponibile.'}
      </p>
    );
  }

  return (
    <div className="admin-form">
      <label className="admin-field admin-field--block">
        <span>Data si ora evenimentului (UTC{offset === 'Z' ? '' : offset})</span>
        <input
          type="datetime-local"
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
        />
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-button" onClick={handleSave} disabled={saving || !localValue}>
          {saving ? 'Se salveaza...' : 'Salveaza data'}
        </button>
        {saveSuccess && <p className="admin-form-success">Data a fost salvata.</p>}
        {saveErrors && (
          <ul className="admin-form-error" role="alert">
            {saveErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
