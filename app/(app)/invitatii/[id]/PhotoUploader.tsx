'use client';

import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resizeImage } from '@/lib/photos/resize';

interface PhotoUploaderProps {
  memoryId: string;
  remaining: number;
}

export default function PhotoUploader({ memoryId, remaining }: PhotoUploaderProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = Array.from(input.files ?? []);
    const files = selected.slice(0, remaining);
    if (files.length === 0) return;
    let uploaded = 0;
    let finalStatus: string | null = null;
    setBusy(true);
    setStatus(null);
    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Se incarca ${index + 1} din ${files.length}...`);
        const resized = await resizeImage(file);
        const body = new FormData();
        body.set('memoryId', memoryId);
        body.set('width', String(resized.width));
        body.set('height', String(resized.height));
        body.set('file', resized.blob, 'poza');
        const response = await fetch('/api/blob-upload', { method: 'POST', body });
        if (!response.ok) {
          const data: { error?: string } | null = await response.json().catch(() => null);
          throw new Error(data?.error ?? 'Incarcarea a esuat.');
        }
        uploaded += 1;
      }
      finalStatus = selected.length > files.length ? `Am incarcat doar primele ${files.length}.` : 'Gata!';
    } catch (err) {
      finalStatus = err instanceof Error ? err.message : 'Incarcarea a esuat.';
    } finally {
      setStatus(finalStatus);
      setBusy(false);
      input.value = '';
      // Pozele deja incarcate trebuie sa apara chiar daca una din urmatoare a esuat.
      if (uploaded > 0) router.refresh();
    }
  }

  if (remaining <= 0) return <p className="hint">Ai atins limita de poze pentru aceasta amintire.</p>;

  return (
    <div className="field">
      <label htmlFor={`photos-${memoryId}`} className="btn btn-ghost">
        {busy ? 'Se incarca...' : `Adauga poze (inca ${remaining})`}
      </label>
      <input
        id={`photos-${memoryId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onChange}
        disabled={busy}
        className="sr-only"
      />
      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
