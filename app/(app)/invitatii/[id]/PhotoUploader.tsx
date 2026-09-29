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
    const files = Array.from(input.files ?? []).slice(0, remaining);
    if (files.length === 0) return;
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
      }
      setStatus('Gata!');
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Incarcarea a esuat.');
    } finally {
      setBusy(false);
      input.value = '';
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
