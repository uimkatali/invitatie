'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });

      if (!response.ok) {
        setError('Deconectarea a esuat. Incearca din nou.');
        return;
      }

      router.push('/admin/login');
      router.refresh();
    } catch {
      setError('Nu s-a putut contacta serverul. Incearca din nou.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-logout-wrap">
      <button
        type="button"
        className="admin-logout"
        onClick={handleLogout}
        disabled={pending}
      >
        {pending ? 'Se deconecteaza...' : 'Deconectare'}
      </button>
      {error && (
        <p className="admin-logout-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
