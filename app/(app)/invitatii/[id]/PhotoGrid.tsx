'use client';

import { useState } from 'react';
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import PhotoLightbox from '@/components/PhotoLightbox';
import type { PhotoView } from '@/lib/memories/queries';
import { deletePhotoAction } from './memory-actions';

interface PhotoGridProps {
  photos: PhotoView[];
  deletable: boolean;
}

interface OpenPhoto {
  id: string;
  trigger: HTMLElement;
}

export default function PhotoGrid({ photos, deletable }: PhotoGridProps) {
  const [open, setOpen] = useState<OpenPhoto | null>(null);
  if (photos.length === 0) return null;
  return (
    <>
      <ul className="photo-grid">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              className="photo-thumb"
              aria-label={`Mareste poza ${index + 1} din ${photos.length}`}
              onClick={(event) => setOpen({ id: photo.id, trigger: event.currentTarget })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image nu trimite cookie-ul de sesiune */}
              <img
                src={`/api/photos/${photo.id}`}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                loading="lazy"
                alt=""
              />
            </button>
            {deletable && (
              <ActionButtonForm
                action={deletePhotoAction.bind(null, photo.id)}
                label="Sterge"
                variant="danger"
                confirmText="Stergi poza?"
              />
            )}
          </li>
        ))}
      </ul>
      {open && <PhotoLightbox key={open.id} photoId={open.id} returnFocusTo={open.trigger} onClose={() => setOpen(null)} />}
    </>
  );
}
