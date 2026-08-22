'use client';

import { useState } from 'react';
import LoginGate from '../../components/LoginGate';
import { THEME_CONFIGS } from '../../lib/themes';
import content from '../../content.json';

type PickStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ThemePage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<PickStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function pickTheme(id: string) {
    setStatus('saving');
    setErrorMessage('');
    try {
      const response = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? 'A esuat.');
        return;
      }
      setActiveId(id);
      setStatus('saved');
    } catch {
      setStatus('error');
      setErrorMessage('A esuat. Verifica conexiunea.');
    }
  }

  const activeName = THEME_CONFIGS.find((theme) => theme.id === activeId)?.name;

  return (
    <LoginGate
      title={content.themeLogin.title}
      hint={content.themeLogin.hint}
      usernameLabel={content.themeLogin.usernameLabel}
      passwordLabel={content.themeLogin.passwordLabel}
      submitText={content.themeLogin.submitText}
      errorText={content.themeLogin.errorText}
      expectedUsername={content.themeLogin.expectedUsername}
      expectedPassword={content.themeLogin.expectedPassword}
    >
      <main className="theme-picker">
        <h1>Alege tema</h1>
        <div className="theme-grid">
          {THEME_CONFIGS.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="theme-swatch"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.bgDark}, ${theme.colors.bgMid})`,
                borderColor: theme.colors.accentPrimary,
              }}
              onClick={() => pickTheme(theme.id)}
              disabled={status === 'saving'}
            >
              <span style={{ color: theme.colors.accentPrimary }}>{theme.name}</span>
            </button>
          ))}
        </div>
        {status === 'saved' && <p className="theme-status">Tema &quot;{activeName}&quot; e activa acum.</p>}
        {status === 'error' && <p className="theme-status theme-status-error">{errorMessage}</p>}
      </main>
    </LoginGate>
  );
}
