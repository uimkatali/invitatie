import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { seedInvitation, seedMemory } from '@/test/fixtures';
import { invitations, memories, photos } from '@/lib/db/schema';
import { LIMITS } from '@/lib/domain';
import type { BlobStore } from './blob-store';
import { addPhoto, deletePhoto, getPhotoForViewing } from './service';

const NOW = new Date('2026-09-28T12:00:00Z');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function fakeBlobStore() {
  const stored = new Map<string, Uint8Array>();
  const store: BlobStore = {
    async put(pathname, body) {
      stored.set(pathname, body);
      return { url: `https://fake.private.blob.test/${pathname}`, pathname };
    },
    async get(pathname) {
      const bytes = stored.get(pathname);
      return bytes ? { stream: new Response(Uint8Array.from(bytes)).body as ReadableStream<Uint8Array>, contentType: 'image/jpeg' } : null;
    },
    async del(pathname) {
      stored.delete(pathname);
    },
  };
  return { stored, store };
}

describe.skipIf(!hasTestDb)('photo service', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  async function memoryOf(author: 'el' | 'ea') {
    return seedMemory(db, await seedInvitation(db), author);
  }

  it('stores a photo on the own memory under a server-chosen path', async () => {
    const { store, stored } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    const r = await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: 800, height: 600 }, NOW);
    expect(r.ok).toBe(true);
    const [row] = await db.select().from(photos);
    expect(row.blobPathname).toMatch(new RegExp(`^photos/${memoryId}/[0-9a-f-]{36}\\.jpg$`));
    expect(row.contentType).toBe('image/jpeg');
    expect(stored.size).toBe(1);
  });

  it("refuses the other user's memory as not_found", async () => {
    const { store, stored } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    const r = await addPhoto(db, store, 'el', memoryId, { bytes: JPEG, width: null, height: null }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'not_found' });
    expect(stored.size).toBe(0);
  });

  it('refuses non-images and oversized files', async () => {
    const { store } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    const svg = new TextEncoder().encode('<svg onload="alert(1)"/>');
    expect(await addPhoto(db, store, 'ea', memoryId, { bytes: svg, width: null, height: null }, NOW)).toMatchObject({
      ok: false,
      code: 'invalid',
    });
    const big = new Uint8Array(LIMITS.photoMaxBytes + 1);
    big.set(JPEG);
    expect(await addPhoto(db, store, 'ea', memoryId, { bytes: big, width: null, height: null }, NOW)).toMatchObject({
      ok: false,
      code: 'invalid',
    });
  });

  it('enforces the per-memory limit', async () => {
    const { store } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    for (let i = 0; i < LIMITS.photosPerMemory; i++) {
      expect((await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: null, height: null }, NOW)).ok).toBe(true);
    }
    expect(await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: null, height: null }, NOW)).toMatchObject({
      ok: false,
      code: 'invalid',
    });
  });

  it('deletes the blob first, then the row, only for the author', async () => {
    const { store, stored } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    const added = await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: null, height: null }, NOW);
    if (!added.ok) throw new Error(added.error);
    const photoId = added.value.id;

    expect(await deletePhoto(db, store, 'el', photoId)).toMatchObject({ ok: false, code: 'not_found' });
    expect(stored.size).toBe(1);

    // Intoarce invitatia din baza de date, ca actiunea sa revalideze pagina corecta (nu una trimisa de client).
    const [{ invitationId }] = await db.select({ invitationId: memories.invitationId }).from(memories).where(eq(memories.id, memoryId));
    expect(await deletePhoto(db, store, 'ea', photoId)).toEqual({ ok: true, value: { invitationId } });
    expect(stored.size).toBe(0);
    expect(await db.select().from(photos).where(eq(photos.id, photoId))).toHaveLength(0);
  });

  it('resolves a photo for viewing by id', async () => {
    const { store } = fakeBlobStore();
    const memoryId = await memoryOf('el');
    const added = await addPhoto(db, store, 'el', memoryId, { bytes: JPEG, width: null, height: null }, NOW);
    if (!added.ok) throw new Error(added.error);
    expect(await getPhotoForViewing(db, added.value.id)).toMatchObject({
      pathname: expect.stringMatching(/^photos\/.+\.jpg$/),
      contentType: 'image/jpeg',
    });
    expect(await getPhotoForViewing(db, 'not-a-uuid')).toBeNull();
  });

  it('keeps the row when the blob deletion throws, and rethrows', async () => {
    const { store, stored } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    const added = await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: null, height: null }, NOW);
    if (!added.ok) throw new Error(added.error);
    const failing: BlobStore = {
      put: store.put,
      get: store.get,
      async del() {
        throw new Error('blob unavailable');
      },
    };

    await expect(deletePhoto(db, failing, 'ea', added.value.id)).rejects.toThrow('blob unavailable');
    expect(await db.select().from(photos).where(eq(photos.id, added.value.id))).toHaveLength(1);
    expect(stored.size).toBe(1);
  });

  it('rejects empty files with a dedicated message', async () => {
    const { store } = fakeBlobStore();
    const memoryId = await memoryOf('ea');
    expect(await addPhoto(db, store, 'ea', memoryId, { bytes: new Uint8Array(), width: null, height: null }, NOW)).toMatchObject({
      ok: false,
      code: 'invalid',
      error: 'Fisier gol.',
    });
  });

  it('refuses photos when the invitation is no longer accepted or has not started', async () => {
    const { store, stored } = fakeBlobStore();
    const invitationId = await seedInvitation(db);
    const memoryId = await seedMemory(db, invitationId, 'ea');
    await db.update(invitations).set({ status: 'declined' }).where(eq(invitations.id, invitationId));
    expect(await addPhoto(db, store, 'ea', memoryId, { bytes: JPEG, width: null, height: null }, NOW)).toMatchObject({
      ok: false,
      code: 'invalid',
    });
    expect(stored.size).toBe(0);
  });
});
