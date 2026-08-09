'use client';

import { useState } from 'react';
import type { SettingsRow } from '../../lib/settings';
import { useSettings } from '../../app/admin/settings-context';

// Every text field editable from this tab, in display order. Deliberately
// excludes `eventDateIso` (DateTab) and `activeThemeId` / `themeColorOverrides`
// (ThemeTab, Task 9) — those get their own dedicated tabs.
const TEXT_FIELDS: { key: keyof SettingsRow; label: string; multiline?: boolean }[] = [
  { key: 'recipientName', label: 'Nume destinatar' },
  { key: 'senderName', label: 'Nume expeditor' },
  { key: 'websiteIntroLine', label: 'Linie introductiva site' },
  { key: 'websiteTapPrompt', label: 'Indemn atingere ecran' },
  { key: 'websiteCountdownLabel', label: 'Eticheta numaratoare inversa' },
  { key: 'websiteCountdownCompleteLabel', label: 'Eticheta numaratoare finalizata' },
  { key: 'emailSubject', label: 'Subiect email' },
  { key: 'emailPreheader', label: 'Preheader email' },
  { key: 'emailCtaText', label: 'Text buton email' },
  { key: 'emailCtaUrl', label: 'URL buton email' },
  { key: 'loginTitle', label: 'Titlu pagina autentificare' },
  { key: 'loginHint', label: 'Indiciu autentificare', multiline: true },
  { key: 'loginUsernameLabel', label: 'Eticheta utilizator' },
  { key: 'loginPasswordLabel', label: 'Eticheta parola' },
  { key: 'loginSubmitText', label: 'Text buton autentificare' },
  { key: 'loginErrorText', label: 'Mesaj eroare autentificare' },
  { key: 'loginExpectedUsername', label: 'Utilizator asteptat' },
  { key: 'loginExpectedPassword', label: 'Parola asteptata' },
];

const ARRAY_FIELDS: { key: 'websiteRevealSteps' | 'emailBodyParagraphs'; label: string }[] = [
  { key: 'websiteRevealSteps', label: 'Pasi de dezvaluire (site)' },
  { key: 'emailBodyParagraphs', label: 'Paragrafe corp email' },
];

export default function ContentTab() {
  const { settings, setSettings, loading, loadError } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function updateField(key: keyof SettingsRow, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateArrayItem(key: 'websiteRevealSteps' | 'emailBodyParagraphs', index: number, value: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  }

  function addArrayItem(key: 'websiteRevealSteps' | 'emailBodyParagraphs') {
    setSettings((prev) => (prev ? { ...prev, [key]: [...prev[key], ''] } : prev));
  }

  function removeArrayItem(key: 'websiteRevealSteps' | 'emailBodyParagraphs', index: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = prev[key].filter((_, i) => i !== index);
      return { ...prev, [key]: next };
    });
  }

  async function handleSave() {
    if (!settings) return;
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
      {TEXT_FIELDS.map(({ key, label, multiline }) => (
        <label key={key} className="admin-field admin-field--block">
          <span>{label}</span>
          {multiline ? (
            <textarea
              value={settings[key] as string}
              onChange={(event) => updateField(key, event.target.value)}
              rows={3}
            />
          ) : (
            <input
              value={settings[key] as string}
              onChange={(event) => updateField(key, event.target.value)}
            />
          )}
        </label>
      ))}

      {ARRAY_FIELDS.map(({ key, label }) => (
        <div key={key} className="admin-field admin-field--block">
          <span>{label}</span>
          <div className="admin-list">
            {settings[key].map((item, index) => (
              <div key={index} className="admin-list-row">
                <input
                  value={item}
                  onChange={(event) => updateArrayItem(key, index, event.target.value)}
                />
                <button
                  type="button"
                  className="admin-list-remove"
                  onClick={() => removeArrayItem(key, index)}
                  disabled={settings[key].length <= 1}
                  aria-label={`Sterge elementul ${index + 1}`}
                >
                  &times;
                </button>
              </div>
            ))}
            <button type="button" className="admin-list-add" onClick={() => addArrayItem(key)}>
              + Adauga
            </button>
          </div>
        </div>
      ))}

      <div className="admin-form-actions">
        <button type="button" className="admin-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Se salveaza...' : 'Salveaza modificarile'}
        </button>
        {saveSuccess && <p className="admin-form-success">Modificarile au fost salvate.</p>}
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
