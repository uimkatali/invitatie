'use client';

import { useState } from 'react';

export default function EmailTab() {
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? 'Trimiterea a esuat.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Nu s-a putut contacta serverul. Incearca din nou.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="admin-form">
      <label className="admin-field admin-field--block">
        <span>Adresa destinatarului</span>
        <input
          type="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="nume@exemplu.com"
        />
      </label>

      <div className="admin-form-actions">
        <button type="button" className="admin-button" onClick={handleSend} disabled={sending || !to}>
          {sending ? 'Se trimite...' : 'Trimite'}
        </button>
        {success && <p className="admin-form-success">Email trimis!</p>}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
