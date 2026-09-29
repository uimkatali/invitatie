import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { memories, photos } from '../db/schema';
import type { UserId } from '../domain';

export interface PhotoView {
  id: string;
  width: number | null;
  height: number | null;
}

export interface MemoryView {
  id: string;
  author: UserId;
  note: string;
  rating: number;
  updatedAt: Date;
  photos: PhotoView[];
}

/** Coloanele sunt alese explicit: blob_url nu iese niciodata din server. */
export async function listMemories(db: Db, invitationId: string): Promise<MemoryView[]> {
  const rows = await db
    .select({
      id: memories.id,
      author: memories.author,
      note: memories.note,
      rating: memories.rating,
      updatedAt: memories.updatedAt,
    })
    .from(memories)
    .where(eq(memories.invitationId, invitationId));
  if (rows.length === 0) return [];

  const photoRows = await db
    .select({ id: photos.id, memoryId: photos.memoryId, width: photos.width, height: photos.height })
    .from(photos)
    .where(inArray(photos.memoryId, rows.map((r) => r.id)))
    .orderBy(asc(photos.createdAt));

  return rows.map((row) => ({
    ...row,
    photos: photoRows
      .filter((p) => p.memoryId === row.id)
      .map((p) => ({ id: p.id, width: p.width, height: p.height })),
  }));
}
