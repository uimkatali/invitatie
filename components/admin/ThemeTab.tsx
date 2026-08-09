'use client';

import { useState } from 'react';
import { THEME_CONFIGS, type ThemeColors } from '../../lib/themes';
import { useSettings } from '../../app/admin/settings-context';

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'bgDark', label: 'Fundal inchis' },
  { key: 'bgMid', label: 'Fundal mediu' },
  { key: 'accentPrimary', label: 'Accent principal' },
  { key: 'accentSecondary', label: 'Accent secundar' },
  { key: 'cream', label: 'Crem' },
];

export default function ThemeTab() {
  const { settings, setSettings, loading, loadError } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  function selectTheme(id: string) {
    setSettings((prev) => (prev ? { ...prev, activeThemeId: id, themeColorOverrides: null } : prev));
  }

  function updateColor(key: keyof ThemeColors, value: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        themeColorOverrides: { ...(prev.themeColorOverrides ?? {}), [key]: value },
      };
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

  const activeTheme = THEME_CONFIGS.find((theme) => theme.id === settings.activeThemeId) ?? THEME_CONFIGS[0];

  return (
    <div className="admin-form">
      <div className="admin-theme-grid">
        {THEME_CONFIGS.map((theme) => (
          <button
            type="button"
            key={theme.id}
            className={`admin-theme-card${theme.id === settings.activeThemeId ? ' is-active' : ''}`}
            onClick={() => selectTheme(theme.id)}
          >
            <span className="admin-theme-swatch">
              {COLOR_FIELDS.map(({ key }) => (
                <span key={key} className="admin-theme-swatch-chip" style={{ background: theme.colors[key] }} />
              ))}
            </span>
            <span className="admin-theme-name">{theme.name}</span>
          </button>
        ))}
      </div>

      <div className="admin-field admin-field--block">
        <span>Culori tema activa: {activeTheme.name}</span>
        <div className="admin-color-pickers">
          {COLOR_FIELDS.map(({ key, label }) => {
            const value = settings.themeColorOverrides?.[key] ?? activeTheme.colors[key];
            return (
              <label key={key} className="admin-color-picker">
                <input
                  type="color"
                  value={value}
                  onChange={(event) => updateColor(key, event.target.value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="admin-form-actions">
        <button type="button" className="admin-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Se salveaza...' : 'Salveaza tema'}
        </button>
        {saveSuccess && <p className="admin-form-success">Tema a fost salvata.</p>}
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
