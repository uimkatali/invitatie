import { LIMITS, otherUser, type UserId } from '@/lib/domain';
import type { MemoryView } from '@/lib/memories/queries';
import MemoryEditor from './MemoryEditor';
import PhotoGrid from './PhotoGrid';
import PhotoUploader from './PhotoUploader';
import { saveMemoryAction } from './memory-actions';

interface MemoriesSectionProps {
  invitationId: string;
  me: UserId;
  names: Record<UserId, string>;
  memories: MemoryView[];
}

function Hearts({ rating }: { rating: number }) {
  return (
    <p className="hearts" role="img" aria-label={`${rating} din 5`}>
      {'♥'.repeat(rating)}
      <span className="hearts-empty">{'♥'.repeat(5 - rating)}</span>
    </p>
  );
}

export default function MemoriesSection({ invitationId, me, names, memories }: MemoriesSectionProps) {
  const mine = memories.find((m) => m.author === me) ?? null;
  const other = otherUser(me);
  const theirs = memories.find((m) => m.author === other) ?? null;

  return (
    <section className="stack" aria-label="Amintiri">
      <h2>Amintiri</h2>
      <div className="grid-2">
        <div className="card stack">
          <h3>Amintirea ta</h3>
          <MemoryEditor action={saveMemoryAction.bind(null, invitationId)} note={mine?.note ?? ''} rating={mine?.rating ?? null} />
          {mine ? (
            <>
              <PhotoGrid photos={mine.photos} deletable />
              <PhotoUploader memoryId={mine.id} remaining={LIMITS.photosPerMemory - mine.photos.length} />
            </>
          ) : (
            <p className="hint">Salveaza amintirea ca sa poti adauga poze.</p>
          )}
        </div>
        <div className="card stack">
          <h3>Amintirea de la {names[other]}</h3>
          {theirs ? (
            <>
              <Hearts rating={theirs.rating} />
              <p className="invitation-message">{theirs.note}</p>
              <PhotoGrid photos={theirs.photos} deletable={false} />
            </>
          ) : (
            <p className="muted">{names[other]} nu a scris inca.</p>
          )}
        </div>
      </div>
    </section>
  );
}
