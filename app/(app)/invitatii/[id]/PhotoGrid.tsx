import ActionButtonForm from '@/components/ui/ActionButtonForm';
import type { PhotoView } from '@/lib/memories/queries';
import { deletePhotoAction } from './memory-actions';

interface PhotoGridProps {
  photos: PhotoView[];
  deletable: boolean;
}

export default function PhotoGrid({ photos, deletable }: PhotoGridProps) {
  if (photos.length === 0) return null;
  return (
    <ul className="photo-grid">
      {photos.map((photo) => (
        <li key={photo.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image nu trimite cookie-ul de sesiune */}
          <img
            src={`/api/photos/${photo.id}`}
            width={photo.width ?? undefined}
            height={photo.height ?? undefined}
            loading="lazy"
            alt="Poza din amintire"
          />
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
  );
}
