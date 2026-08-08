'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? 'Autentificare esuata.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Nu s-a putut contacta serverul. Incearca din nou.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login-form">
        <div className="admin-login-mark">ADMIN</div>
        <h1 className="admin-login-title">Autentificare</h1>
        <label className="admin-field">
          <span>Utilizator</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="admin-field">
          <span>Parola</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="admin-button" disabled={pending}>
          {pending ? 'Se autentifica...' : 'Intra in panou'}
        </button>
        {error && (
          <p className="admin-login-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
