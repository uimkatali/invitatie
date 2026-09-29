import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { memories, photos } from '../db/schema';
import { LIMITS, type UserId } from '../domain';
import { isUuid, newId } from '../ids';
import { log } from '../log';
import { failure, ok, type Result } from '../result';
import { getInvitation } from '../invitations/queries';
import { canHaveMemories } from '../memories/service';
import type { BlobStore } from './blob-store';
import { IMAGE_EXTENSIONS, sniffImageType } from './validate';

export interface PhotoUpload {
  bytes: Uint8Array;
  width: number | null;
  height: number | null;
}

const MEMORY_NOT_FOUND = 'Amintirea nu exista.';
const PHOTO_NOT_FOUND = 'Poza nu exista.';

export async function addPhoto(
  db: Db,
  blob: BlobStore,
  actor: UserId,
  memoryId: string,
  upload: PhotoUpload,
  now: Date,
): Promise<Result<{ id: string }>> {
  if (!isUuid(memoryId)) return failure('not_found', MEMORY_NOT_FOUND);
  const [memory] = await db
    .select({ id: memories.id, author: memories.author, invitationId: memories.invitationId })
    .from(memories)
    .where(eq(memories.id, memoryId))
    .limit(1);
  // Amintirea altcuiva arata la fel ca una inexistenta.
  if (!memory || memory.author !== actor) return failure('not_found', MEMORY_NOT_FOUND);

  const inv = await getInvitation(db, memory.invitationId);
  if (!inv) return failure('not_found', MEMORY_NOT_FOUND);
  if (!canHaveMemories(inv, now)) return failure('invalid', 'Poti adauga poze doar dupa un date acceptat.');

  if (upload.bytes.length === 0) return failure('invalid', 'Fisier gol.');
  if (upload.bytes.length > LIMITS.photoMaxBytes) return failure('invalid', 'Poza e prea mare (maxim 4 MB).');
  const contentType = sniffImageType(upload.bytes);
  if (!contentType) return failure('invalid', 'Sunt acceptate doar poze JPEG, PNG sau WebP.');

  // Numaratoarea nu e atomica: doua upload-uri paralele ale aceluiasi autor pot depasi limita (impact minor).
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(photos)
    .where(eq(photos.memoryId, memoryId));
  if (n >= LIMITS.photosPerMemory) return failure('invalid', `Poti adauga maxim ${LIMITS.photosPerMemory} poze.`);

  const id = newId();
  const stored = await blob.put(`photos/${memoryId}/${id}.${IMAGE_EXTENSIONS[contentType]}`, upload.bytes, contentType);
  try {
    await db.insert(photos).values({
      id,
      memoryId,
      blobUrl: stored.url,
      blobPathname: stored.pathname,
      contentType,
      width: upload.width,
      height: upload.height,
      createdAt: now,
    });
  } catch (err) {
    try {
      await blob.del(stored.url);
    } catch {
      log('error', 'orphan_blob', { photoId: id });
    }
    throw err;
  }
  return ok({ id });
}

async function findPhotoWithAuthor(db: Db, photoId: string) {
  if (!isUuid(photoId)) return null;
  const [row] = await db
    .select({
      id: photos.id,
      blobUrl: photos.blobUrl,
      contentType: photos.contentType,
      author: memories.author,
      invitationId: memories.invitationId,
    })
    .from(photos)
    .innerJoin(memories, eq(photos.memoryId, memories.id))
    .where(eq(photos.id, photoId))
    .limit(1);
  return row ?? null;
}

/**
 * Sterge intai blob-ul; daca stergerea arunca, randul ramane (eroarea se propaga).
 * Intoarce invitatia din baza de date, ca apelantul sa revalideze pagina corecta.
 */
export async function deletePhoto(
  db: Db,
  blob: BlobStore,
  actor: UserId,
  photoId: string,
): Promise<Result<{ invitationId: string }>> {
  const photo = await findPhotoWithAuthor(db, photoId);
  if (!photo || photo.author !== actor) return failure('not_found', PHOTO_NOT_FOUND);
  await blob.del(photo.blobUrl);
  await db.delete(photos).where(eq(photos.id, photo.id));
  return ok({ invitationId: photo.invitationId });
}

/** Doar pentru route handler-ul care face stream; URL-ul nu se trimite clientului. */
export async function getPhotoForViewing(db: Db, photoId: string): Promise<{ url: string; contentType: string } | null> {
  const photo = await findPhotoWithAuthor(db, photoId);
  return photo ? { url: photo.blobUrl, contentType: photo.contentType } : null;
}
