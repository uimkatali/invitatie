'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="admin-logout"
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? 'Se deconecteaza...' : 'Deconectare'}
    </button>
  );
}
