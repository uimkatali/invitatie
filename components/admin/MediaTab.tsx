'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { MEDIA_ZONES, type MediaItem, type MediaZone } from '../../lib/media';

const ZONE_LABELS: Record<MediaZone, string> = {
  heroBackground: 'Fundal scena 3D',
  revealBackground: 'Fundal mesaj',
  gallery: 'Galerie',
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(url);
}

export default function MediaTab() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zone, setZone] = useState<MediaZone>('heroBackground');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/admin/media');
      if (!response.ok) {
        throw new Error('Nu s-au putut incarca fisierele.');
      }
      const data: MediaItem[] = await response.json();
      setItems(data);
    } catch {
      setLoadError('Nu s-au putut incarca fisierele. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/admin/media/upload-url',
      });

      const response = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, zone }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Salvarea fisierului a esuat.');
      }

      await loadItems();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Incarcarea a esuat.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
      await loadItems();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="admin-panel-placeholder">Se incarca fisierele...</p>;
  }

  if (loadError || !items) {
    return (
      <p className="admin-panel-placeholder admin-form-error">
        {loadError ?? 'Fisierele nu sunt disponibile.'}
      </p>
    );
  }

  return (
    <div className="admin-form">
      <div className="admin-field">
        <span>Zona</span>
        <select
          className="admin-select"
          value={zone}
          onChange={(event) => setZone(event.target.value as MediaZone)}
        >
          {MEDIA_ZONES.map((z) => (
            <option key={z} value={z}>
              {ZONE_LABELS[z]}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <span>Incarca poza sau video</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {uploading && <p className="admin-form-success">Se incarca...</p>}
      {uploadError && (
        <ul className="admin-form-error" role="alert">
          <li>{uploadError}</li>
        </ul>
      )}

      {MEDIA_ZONES.map((z) => {
        const zoneItems = items.filter((item) => item.zone === z);
        if (zoneItems.length === 0) return null;

        return (
          <div key={z} className="admin-field admin-field--block">
            <span>{ZONE_LABELS[z]}</span>
            <div className="admin-media-grid">
              {zoneItems.map((item) => (
                <div key={item.id} className="admin-media-item">
                  {isVideoUrl(item.url) ? (
                    <video src={item.url} className="admin-media-thumb" muted />
                  ) : (
                    <img src={item.url} alt="" className="admin-media-thumb" />
                  )}
                  <button
                    type="button"
                    className="admin-list-remove"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
