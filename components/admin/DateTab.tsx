'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/admin/settings-context';
import { parseIso, toIsoWithOffset } from '../../lib/date-offset';

export default function DateTab() {
  const { settings, setSettings, loading, loadError } = useSettings();
  const [localValue, setLocalValue] = useState(() => parseIso(settings?.eventDateIso ?? '').localValue);
  const [offset, setOffset] = useState(() => parseIso(settings?.eventDateIso ?? '').offset);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // The shared settings object is fetched once at the provider level and may
  // still be loading when this tab first mounts. Derive the local editing
  // state (localValue/offset) from it the moment it becomes available, but
  // only once per mount — after that, this tab's own edits (written into the
  // shared settings via setSettings below) are the source of truth, so we
  // must not let this effect re-derive and clobber in-progress typing.
  const initializedRef = useRef(settings !== null);
  useEffect(() => {
    if (initializedRef.current || !settings) return;
    const parsed = parseIso(settings.eventDateIso);
    setLocalValue(parsed.localValue);
    setOffset(parsed.offset);
    initializedRef.current = true;
  }, [settings]);

  function handleLocalValueChange(value: string) {
    setLocalValue(value);
    if (!value) return;
    const nextIso = toIsoWithOffset(value, offset);
    setSettings((prev) => (prev ? { ...prev, eventDateIso: nextIso } : prev));
  }

  async function handleSave() {
    if (!settings || !localValue) return;
    setSaving(true);
    setSaveErrors(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSaveErrors(Array.isArray(data.errors) ? data.errors : ['Salvarea a esuat.']);
        return;
      }

      setSettings(settings);
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
          onChange={(event) => handleLocalValueChange(event.target.value)}
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
