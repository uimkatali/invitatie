# Faza 3: Amintiri, poze, idei, calendar - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jurnalul de dupa date (nota + rating + pana la 10 poze private per user), lista comuna de idei transformabila in invitatie, calendar lunar.

**Architecture:** Serviciile primesc `db` si, pentru poze, o interfata `BlobStore` (implementare reala peste `@vercel/blob`, implementare falsa in teste). Pozele trec prin server: `POST /api/blob-upload` valideaza tot si scrie in Blob cu pathname generat de server; `GET /api/photos/[id]` le serveste dupa verificarea sesiunii. URL-ul Blob nu ajunge niciodata la client. Calendarul e aritmetica pura in `lib/calendar.ts`.

**Tech Stack:** Next.js 16 route handlers, Drizzle, `@vercel/blob`, zod 4, canvas API (redimensionare in browser), Vitest.

**Prerequisite:** Fazele 1-2 terminate. Spec sectiunile 6, 8, 10. Abaterile 1-3 din `2026-09-28-date-manager-00-overview.md`.

---

## File map (Faza 3)

| Fisier | Responsabilitate |
|---|---|
| `lib/validation.ts` | + `memorySchema`, `ideaSchema` (modificat) |
| `test/fixtures.ts` | `seedInvitation` pentru teste |
| `lib/memories/service.ts`, `lib/memories/queries.ts` | salvare / citire amintiri |
| `lib/photos/validate.ts` | magic bytes, dimensiuni |
| `lib/photos/blob-store.ts` | interfata `BlobStore` + implementarea Vercel |
| `lib/photos/service.ts` | adaugare / stergere / citire poza |
| `lib/photos/resize.ts` | redimensionare in browser |
| `lib/security/origin.ts` | verificare Origin pentru route handlers |
| `app/api/blob-upload/route.ts`, `app/api/photos/[id]/route.ts` | upload si servire poze |
| `app/(app)/invitatii/[id]/memory-actions.ts` | Server Actions amintiri / poze |
| `app/(app)/invitatii/[id]/{MemoriesSection,MemoryEditor,PhotoGrid,PhotoUploader}.tsx` | UI amintiri |
| `lib/ideas/service.ts`, `lib/ideas/queries.ts` | idei |
| `app/(app)/idei/{page.tsx,IdeaForm.tsx,actions.ts}` | pagina de idei |
| `app/(app)/invitatii/noua/page.tsx` | precompletare din idee (modificat) |
| `lib/calendar.ts`, `app/(app)/calendar/page.tsx` | calendar |
| `components/AppHeader.tsx` | + Calendar, Idei (modificat) |

---

### Task 1: Scheme pentru amintiri si idei + fixture de test

**Files:**
- Modify: `lib/validation.ts` (adaugare la final), `lib/validation.test.ts` (adaugare la final)
- Create: `test/fixtures.ts`

- [ ] **Step 1: Adauga testele la finalul `lib/validation.test.ts`**

```ts
import { memorySchema, ideaSchema } from './validation';

describe('memorySchema', () => {
  it('parses note and coerces rating', () => {
    const r = memorySchema.safeParse({ note: ' A fost minunat ', rating: '5' });
    expect(r.success && r.data).toEqual({ note: 'A fost minunat', rating: 5 });
  });

  it('rejects ratings outside 1-5 and empty notes', () => {
    expect(memorySchema.safeParse({ note: 'ok', rating: '0' }).success).toBe(false);
    expect(memorySchema.safeParse({ note: 'ok', rating: '6' }).success).toBe(false);
    expect(memorySchema.safeParse({ note: 'ok', rating: '' }).success).toBe(false);
    expect(memorySchema.safeParse({ note: '  ', rating: '3' }).success).toBe(false);
  });
});

describe('ideaSchema', () => {
  it('parses title and optional description', () => {
    const r = ideaSchema.safeParse({ title: 'Picnic', description: '' });
    expect(r.success && r.data).toEqual({ title: 'Picnic', description: null });
  });
});
```

(Muta importul `memorySchema, ideaSchema` in linia de import existenta din varful fisierului: `import { invitationSchema, respondSchema, memorySchema, ideaSchema } from './validation';`.)

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/validation.test.ts`
Expected: FAIL (`memorySchema` nu exista).

- [ ] **Step 3: Adauga la finalul `lib/validation.ts`**

```ts
export const memorySchema = z.object({
  note: required('Textul', LIMITS.memoryNoteMax),
  rating: z.coerce
    .number({ error: 'Alege o nota intre 1 si 5' })
    .int('Alege o nota intre 1 si 5')
    .min(1, 'Alege o nota intre 1 si 5')
    .max(5, 'Alege o nota intre 1 si 5'),
});

export type MemoryInput = z.infer<typeof memorySchema>;

export const ideaSchema = z.object({
  title: required('Titlul', LIMITS.ideaTitleMax),
  description: optionalText(LIMITS.ideaDescriptionMax),
});

export type IdeaInput = z.infer<typeof ideaSchema>;
```

- [ ] **Step 4: Creeaza `test/fixtures.ts`**

```ts
import type { Db } from '@/lib/db/client';
import { invitations, memories } from '@/lib/db/schema';
import type { UserId } from '@/lib/domain';
import { newId } from '@/lib/ids';

type InvitationInsert = typeof invitations.$inferInsert;

/** Invitatie acceptata, cu data in trecut (deci permite amintiri). */
export async function seedInvitation(db: Db, over: Partial<InvitationInsert> = {}): Promise<string> {
  const id = newId();
  const created = new Date('2026-09-01T10:00:00Z');
  await db.insert(invitations).values({
    id,
    fromUser: 'el',
    toUser: 'ea',
    title: 'Cina',
    message: 'Te astept',
    location: 'Acasa',
    startsAt: new Date('2026-09-10T17:00:00Z'),
    dressCode: null,
    theme: 'amandoua',
    status: 'accepted',
    proposedAt: null,
    responseNote: null,
    ideaId: null,
    createdAt: created,
    updatedAt: created,
    ...over,
  });
  return id;
}

export async function seedMemory(db: Db, invitationId: string, author: UserId): Promise<string> {
  const id = newId();
  const now = new Date('2026-09-11T10:00:00Z');
  await db.insert(memories).values({ id, invitationId, author, note: 'Frumos', rating: 5, createdAt: now, updatedAt: now });
  return id;
}
```

- [ ] **Step 5: Ruleaza testele**

Run: `npx vitest run lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts test/fixtures.ts
git commit -m "feat: add memory and idea schemas, test fixtures"
```

---

### Task 2: Serviciul de amintiri

**Files:**
- Create: `lib/memories/service.ts`, `lib/memories/queries.ts`
- Test: `lib/memories/service.test.ts`, `lib/memories/service.int.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/memories/service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canHaveMemories } from './service';

const NOW = new Date('2026-09-28T12:00:00Z');

describe('canHaveMemories', () => {
  it('only for accepted dates that already started', () => {
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(true);
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-10-20T17:00:00Z') }, NOW)).toBe(false);
    expect(canHaveMemories({ status: 'declined', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(false);
  });
});
```

`lib/memories/service.int.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { seedInvitation } from '@/test/fixtures';
import { countUnread } from '../notifications/queries';
import { saveMemory } from './service';
import { listMemories } from './queries';

const NOW = new Date('2026-09-28T12:00:00Z');

describe.skipIf(!hasTestDb)('memory service', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  it('creates once, then updates, notifying only on create', async () => {
    const invitationId = await seedInvitation(db);
    const first = await saveMemory(db, 'ea', invitationId, { note: 'Superb', rating: 5 }, NOW);
    expect(first).toMatchObject({ ok: true, value: { created: true } });
    const second = await saveMemory(db, 'ea', invitationId, { note: 'Superb, serios', rating: 4 }, NOW);
    expect(second).toMatchObject({ ok: true, value: { created: false } });

    const list = await listMemories(db, invitationId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ author: 'ea', note: 'Superb, serios', rating: 4, photos: [] });
    expect(await countUnread(db, 'el')).toBe(1);
  });

  it('keeps one memory per author', async () => {
    const invitationId = await seedInvitation(db);
    await saveMemory(db, 'el', invitationId, { note: 'A', rating: 5 }, NOW);
    await saveMemory(db, 'ea', invitationId, { note: 'B', rating: 5 }, NOW);
    expect((await listMemories(db, invitationId)).map((m) => m.author).sort()).toEqual(['ea', 'el']);
  });

  it('rejects memories for future or declined dates', async () => {
    const future = await seedInvitation(db, { startsAt: new Date('2026-10-20T17:00:00Z') });
    expect(await saveMemory(db, 'el', future, { note: 'x', rating: 3 }, NOW)).toMatchObject({ ok: false, code: 'invalid' });
    const declined = await seedInvitation(db, { status: 'declined' });
    expect(await saveMemory(db, 'el', declined, { note: 'x', rating: 3 }, NOW)).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('returns not_found for unknown invitations', async () => {
    const r = await saveMemory(db, 'el', '44444444-4444-4444-8444-444444444444', { note: 'x', rating: 3 }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'not_found' });
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/memories`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/memories/service.ts`:

```ts
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { memories, type InvitationRow } from '../db/schema';
import { otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { MemoryInput } from '../validation';
import { getInvitation } from '../invitations/queries';
import { insertNotification } from '../notifications/create';

export function canHaveMemories(inv: Pick<InvitationRow, 'status' | 'startsAt'>, now: Date): boolean {
  return inv.status === 'accepted' && inv.startsAt.getTime() <= now.getTime();
}

export async function saveMemory(
  db: Db,
  actor: UserId,
  invitationId: string,
  input: MemoryInput,
  now: Date,
): Promise<Result<{ memoryId: string; created: boolean }>> {
  const inv = await getInvitation(db, invitationId);
  if (!inv) return failure('not_found', 'Invitatia nu exista.');
  if (!canHaveMemories(inv, now)) return failure('invalid', 'Poti scrie amintiri doar dupa un date acceptat.');

  const [existing] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(and(eq(memories.invitationId, inv.id), eq(memories.author, actor)))
    .limit(1);

  if (existing) {
    await db
      .update(memories)
      .set({ note: input.note, rating: input.rating, updatedAt: now })
      .where(eq(memories.id, existing.id));
    return ok({ memoryId: existing.id, created: false });
  }

  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(memories).values({
      id,
      invitationId: inv.id,
      author: actor,
      note: input.note,
      rating: input.rating,
      createdAt: now,
      updatedAt: now,
    });
    await insertNotification(tx, { recipient: otherUser(actor), type: 'memory_added', invitationId: inv.id, now });
  });
  return ok({ memoryId: id, created: true });
}
```

`lib/memories/queries.ts`:

```ts
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
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/memories`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/memories
git commit -m "feat: add memory service and queries"
```

---

### Task 3: Validarea pozelor si Origin

**Files:**
- Create: `lib/photos/validate.ts`, `lib/photos/resize.ts`, `lib/security/origin.ts`
- Test: `lib/photos/validate.test.ts`, `lib/photos/resize.test.ts`, `lib/security/origin.test.ts`

- [ ] **Step 1: Scrie testele**

`lib/photos/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sniffImageType, parseDimension } from './validate';

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe('sniffImageType', () => {
  it('detects jpeg, png and webp by magic bytes', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('rejects everything else, including svg and html', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<html>'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe('parseDimension', () => {
  it('accepts sane integers only', () => {
    expect(parseDimension('1200')).toBe(1200);
    expect(parseDimension('0')).toBeNull();
    expect(parseDimension('99999')).toBeNull();
    expect(parseDimension('12.5')).toBeNull();
    expect(parseDimension(null)).toBeNull();
  });
});
```

`lib/photos/resize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fitWithin } from './resize';

describe('fitWithin', () => {
  it('keeps small images unchanged', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest side down to the max, keeping ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });
});
```

`lib/security/origin.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isSameOrigin } from './origin';

describe('isSameOrigin', () => {
  it('accepts a matching origin', () => {
    expect(isSameOrigin(new Headers({ origin: 'https://noi.app', host: 'noi.app' }))).toBe(true);
    expect(isSameOrigin(new Headers({ origin: 'https://noi.app', 'x-forwarded-host': 'noi.app', host: 'internal' }))).toBe(true);
  });

  it('rejects other or missing origins', () => {
    expect(isSameOrigin(new Headers({ origin: 'https://evil.example', host: 'noi.app' }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: 'noi.app' }))).toBe(false);
    expect(isSameOrigin(new Headers({ origin: 'null', host: 'noi.app' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/photos lib/security/origin.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza**

`lib/photos/validate.ts`:

```ts
export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export const IMAGE_EXTENSIONS: Record<ImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, i) => bytes[offset + i] === value);
}

/** Tipul real al fisierului dupa continut; Content-Type-ul trimis de client e ignorat. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

export function parseDimension(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= 10000 ? n : null;
}
```

`lib/photos/resize.ts`:

```ts
export const MAX_DIMENSION = 2000;

export function fitWithin(width: number, height: number, max = MAX_DIMENSION): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Doar in browser. Redimensioneaza si re-encodeaza poza (webp, sau jpeg unde webp nu e suportat).
 * Re-encodarea sterge metadatele EXIF, inclusiv locatia GPS.
 */
export async function resizeImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browserul nu poate procesa poza.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, 'image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Poza nu a putut fi procesata.');
  return { blob, width, height };
}
```

`lib/security/origin.ts`:

```ts
/**
 * Server Actions au verificarea Origin incorporata; route handlers nu.
 * O folosim pe orice route handler care modifica date.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/photos lib/security/origin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/photos lib/security/origin.ts lib/security/origin.test.ts
git commit -m "feat: add photo validation, client resize and origin check"
```

---

### Task 4: Serviciul de poze

**Files:**
- Create: `lib/photos/blob-store.ts`, `lib/photos/service.ts`
- Test: `lib/photos/service.int.test.ts`

- [ ] **Step 1: Scrie testul de integrare**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { seedInvitation, seedMemory } from '@/test/fixtures';
import { photos } from '@/lib/db/schema';
import { LIMITS } from '@/lib/domain';
import type { BlobStore } from './blob-store';
import { addPhoto, deletePhoto, getPhotoForViewing } from './service';

const NOW = new Date('2026-09-28T12:00:00Z');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function fakeBlobStore() {
  const stored = new Map<string, Uint8Array>();
  const store: BlobStore = {
    async put(pathname, body) {
      const url = `https://fake.blob.test/${pathname}`;
      stored.set(url, body);
      return { url, pathname };
    },
    async del(url) {
      stored.delete(url);
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

    expect((await deletePhoto(db, store, 'ea', photoId)).ok).toBe(true);
    expect(stored.size).toBe(0);
    expect(await db.select().from(photos).where(eq(photos.id, photoId))).toHaveLength(0);
  });

  it('resolves a photo for viewing by id', async () => {
    const { store } = fakeBlobStore();
    const memoryId = await memoryOf('el');
    const added = await addPhoto(db, store, 'el', memoryId, { bytes: JPEG, width: null, height: null }, NOW);
    if (!added.ok) throw new Error(added.error);
    expect(await getPhotoForViewing(db, added.value.id)).toMatchObject({ contentType: 'image/jpeg' });
    expect(await getPhotoForViewing(db, 'not-a-uuid')).toBeNull();
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/photos/service.int.test.ts`
Expected: FAIL (cu baza de test).

- [ ] **Step 3: Implementeaza**

`lib/photos/blob-store.ts`:

```ts
import { put, del } from '@vercel/blob';

export interface BlobStore {
  put(pathname: string, body: Uint8Array, contentType: string): Promise<{ url: string; pathname: string }>;
  del(url: string): Promise<void>;
}

export function vercelBlobStore(token: string): BlobStore {
  return {
    async put(pathname, body, contentType) {
      const result = await put(pathname, Buffer.from(body), {
        access: 'public',
        contentType,
        addRandomSuffix: true,
        token,
      });
      return { url: result.url, pathname: result.pathname };
    },
    async del(url) {
      await del(url, { token });
    },
  };
}
```

`lib/photos/service.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { memories, photos } from '../db/schema';
import { LIMITS, type UserId } from '../domain';
import { isUuid, newId } from '../ids';
import { failure, ok, type Result } from '../result';
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
    .select({ id: memories.id, author: memories.author })
    .from(memories)
    .where(eq(memories.id, memoryId))
    .limit(1);
  // Amintirea altcuiva arata la fel ca una inexistenta.
  if (!memory || memory.author !== actor) return failure('not_found', MEMORY_NOT_FOUND);

  if (upload.bytes.length === 0 || upload.bytes.length > LIMITS.photoMaxBytes) {
    return failure('invalid', 'Poza e prea mare (maxim 4 MB).');
  }
  const contentType = sniffImageType(upload.bytes);
  if (!contentType) return failure('invalid', 'Sunt acceptate doar poze JPEG, PNG sau WebP.');

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
    await blob.del(stored.url);
    throw err;
  }
  return ok({ id });
}

async function findPhotoWithAuthor(db: Db, photoId: string) {
  if (!isUuid(photoId)) return null;
  const [row] = await db
    .select({ id: photos.id, blobUrl: photos.blobUrl, contentType: photos.contentType, author: memories.author })
    .from(photos)
    .innerJoin(memories, eq(photos.memoryId, memories.id))
    .where(eq(photos.id, photoId))
    .limit(1);
  return row ?? null;
}

export async function deletePhoto(db: Db, blob: BlobStore, actor: UserId, photoId: string): Promise<Result> {
  const photo = await findPhotoWithAuthor(db, photoId);
  if (!photo || photo.author !== actor) return failure('not_found', PHOTO_NOT_FOUND);
  await blob.del(photo.blobUrl);
  await db.delete(photos).where(eq(photos.id, photo.id));
  return ok(undefined);
}

/** Doar pentru route handler-ul care face stream; URL-ul nu se trimite clientului. */
export async function getPhotoForViewing(db: Db, photoId: string): Promise<{ url: string; contentType: string } | null> {
  const photo = await findPhotoWithAuthor(db, photoId);
  return photo ? { url: photo.blobUrl, contentType: photo.contentType } : null;
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/photos`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/photos
git commit -m "feat: add photo service with server-side validation and blob cleanup"
```

---

### Task 5: Route handlers pentru poze

**Files:**
- Create: `app/api/blob-upload/route.ts`, `app/api/photos/[id]/route.ts`

- [ ] **Step 1: Scrie `app/api/blob-upload/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { LIMITS } from '@/lib/domain';
import { env } from '@/lib/env';
import { log, errorName } from '@/lib/log';
import { vercelBlobStore } from '@/lib/photos/blob-store';
import { addPhoto } from '@/lib/photos/service';
import { parseDimension } from '@/lib/photos/validate';
import { isSameOrigin } from '@/lib/security/origin';

const MAX_BODY_BYTES = LIMITS.photoMaxBytes + 64 * 1024;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return error('Neautentificat.', 401);
  if (!isSameOrigin(request.headers)) {
    log('warn', 'cross_origin_upload_blocked');
    return error('Cerere respinsa.', 403);
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) return error('Poza e prea mare (maxim 4 MB).', 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const memoryId = form?.get('memoryId');
  if (!form || !(file instanceof File) || typeof memoryId !== 'string') return error('Cerere invalida.', 400);
  if (file.size > LIMITS.photoMaxBytes) return error('Poza e prea mare (maxim 4 MB).', 413);

  try {
    const result = await addPhoto(
      getDb(),
      vercelBlobStore(env().BLOB_READ_WRITE_TOKEN),
      user,
      memoryId,
      {
        bytes: new Uint8Array(await file.arrayBuffer()),
        width: parseDimension(form.get('width')),
        height: parseDimension(form.get('height')),
      },
      new Date(),
    );
    if (!result.ok) {
      if (result.code === 'not_found') log('warn', 'upload_to_foreign_memory', { user });
      return error(result.error, result.code === 'not_found' ? 404 : 400);
    }
    return NextResponse.json({ id: result.value.id }, { status: 201 });
  } catch (err) {
    log('error', 'upload_failed', { reason: errorName(err) });
    return error('Incarcarea a esuat.', 500);
  }
}
```

- [ ] **Step 2: Scrie `app/api/photos/[id]/route.ts`**

```ts
import { getSessionUser } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { log, errorName } from '@/lib/log';
import { getPhotoForViewing } from '@/lib/photos/service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  try {
    const photo = await getPhotoForViewing(getDb(), id);
    if (!photo) return new Response(null, { status: 404 });

    const upstream = await fetch(photo.url);
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 502 });

    return new Response(upstream.body, {
      headers: {
        'Content-Type': photo.contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    log('error', 'photo_stream_failed', { reason: errorName(err) });
    return new Response(null, { status: 500 });
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 4: Commit**

```bash
git add app/api
git commit -m "feat: add authenticated photo upload and streaming routes"
```

---

### Task 6: UI pentru amintiri

**Files:**
- Create: `app/(app)/invitatii/[id]/memory-actions.ts`, `MemoriesSection.tsx`, `MemoryEditor.tsx`, `PhotoGrid.tsx`, `PhotoUploader.tsx` (toate in `app/(app)/invitatii/[id]/`)
- Modify: `app/(app)/invitatii/[id]/page.tsx`, `app/globals.css` (adaugare la final)

- [ ] **Step 1: Scrie `memory-actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { env } from '@/lib/env';
import { saveMemory } from '@/lib/memories/service';
import { vercelBlobStore } from '@/lib/photos/blob-store';
import { deletePhoto } from '@/lib/photos/service';
import { memorySchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

export async function saveMemoryAction(invitationId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, ['note', 'rating']);
  const parsed = memorySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: 'Verifica amintirea.', fields: toFieldErrors(parsed.error), values };
  try {
    const result = await saveMemory(getDb(), actor, invitationId, parsed.data, new Date());
    if (!result.ok) return toActionState(result);
  } catch (err) {
    log('error', 'save_memory_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values };
  }
  revalidatePath(`/invitatii/${invitationId}`);
  return { ok: true, message: 'Amintire salvata.' };
}

export async function deletePhotoAction(
  photoId: string,
  invitationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const actor = await requireSession();
  try {
    const result = await deletePhoto(getDb(), vercelBlobStore(env().BLOB_READ_WRITE_TOKEN), actor, photoId);
    if (!result.ok) return toActionState(result);
  } catch (err) {
    log('error', 'delete_photo_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath(`/invitatii/${invitationId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Scrie `MemoryEditor.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import type { ActionState } from '@/lib/result';

interface MemoryEditorProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  note: string;
  rating: number | null;
}

export default function MemoryEditor({ action, note, rating }: MemoryEditorProps) {
  const [state, formAction] = useActionState(action, null);
  const failed = state && !state.ok ? state : null;
  const currentRating = Number(failed?.values?.rating ?? rating ?? 0);

  return (
    <form action={formAction} className="form">
      <Field label="Cum a fost?" htmlFor="note" error={failed?.fields?.note}>
        <textarea
          id="note"
          name="note"
          required
          maxLength={LIMITS.memoryNoteMax}
          defaultValue={failed?.values?.note ?? note}
        />
      </Field>
      <fieldset className="field">
        <legend>Nota</legend>
        <div className="rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="rating-option">
              <input type="radio" name="rating" value={value} defaultChecked={currentRating === value} required />
              <span aria-hidden="true">♥</span>
              <span className="sr-only">{value} din 5</span>
            </label>
          ))}
        </div>
        {failed?.fields?.rating && <p className="field-error">{failed.fields.rating}</p>}
      </fieldset>
      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
      <SubmitButton label="Salveaza amintirea" pendingLabel="Se salveaza..." />
    </form>
  );
}
```

- [ ] **Step 3: Scrie `PhotoUploader.tsx`**

```tsx
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
```

- [ ] **Step 4: Scrie `PhotoGrid.tsx`**

```tsx
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import type { PhotoView } from '@/lib/memories/queries';
import { deletePhotoAction } from './memory-actions';

interface PhotoGridProps {
  photos: PhotoView[];
  invitationId: string;
  deletable: boolean;
}

export default function PhotoGrid({ photos, invitationId, deletable }: PhotoGridProps) {
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
              action={deletePhotoAction.bind(null, photo.id, invitationId)}
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
```

- [ ] **Step 5: Scrie `MemoriesSection.tsx`**

```tsx
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
    <p className="hearts" aria-label={`${rating} din 5`}>
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
              <PhotoGrid photos={mine.photos} invitationId={invitationId} deletable />
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
              <PhotoGrid photos={theirs.photos} invitationId={invitationId} deletable={false} />
            </>
          ) : (
            <p className="muted">{names[other]} nu a scris inca.</p>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Leaga sectiunea in `app/(app)/invitatii/[id]/page.tsx`**

Adauga importurile:

```tsx
import { listMemories } from '@/lib/memories/queries';
import { canHaveMemories } from '@/lib/memories/service';
import MemoriesSection from './MemoriesSection';
```

Inainte de `return`, dupa `const canRespond = ...`, adauga:

```tsx
  const memories = canHaveMemories(invitation, now) ? await listMemories(db, invitation.id) : null;
```

In JSX, dupa `<CreatorActions ... />`, adauga:

```tsx
      {memories && <MemoriesSection invitationId={invitation.id} me={me} names={names} memories={memories} />}
```

- [ ] **Step 7: Adauga la finalul `app/globals.css`**

```css
/* Faza 3: amintiri si poze */
.rating { display: flex; gap: 6px; }
.rating-option { position: relative; font-size: 1.8rem; color: #e8c9d4; cursor: pointer; }
.rating-option input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
.rating:has(.rating-option:nth-child(1) input:checked) .rating-option:nth-child(-n + 1),
.rating:has(.rating-option:nth-child(2) input:checked) .rating-option:nth-child(-n + 2),
.rating:has(.rating-option:nth-child(3) input:checked) .rating-option:nth-child(-n + 3),
.rating:has(.rating-option:nth-child(4) input:checked) .rating-option:nth-child(-n + 4),
.rating:has(.rating-option:nth-child(5) input:checked) .rating-option:nth-child(-n + 5) { color: var(--pink-300); }
.rating-option:has(input:focus-visible) { outline: 3px solid var(--blue-300); border-radius: 8px; }
.hearts { color: var(--pink-300); font-size: 1.4rem; letter-spacing: 2px; }
.hearts-empty { color: #e8c9d4; }
.photo-grid { list-style: none; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
.photo-grid li { display: grid; gap: 6px; }
.photo-grid img { width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; border-radius: 14px; background: var(--pink-100); }
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: fara erori.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/invitatii/[id]" app/globals.css
git commit -m "feat: add memories with rating and private photos"
```

---

### Task 7: Serviciul de idei

**Files:**
- Create: `lib/ideas/service.ts`, `lib/ideas/queries.ts`
- Test: `lib/ideas/service.int.test.ts`

- [ ] **Step 1: Scrie testul de integrare**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { seedInvitation } from '@/test/fixtures';
import { LIMITS } from '@/lib/domain';
import { ideas as ideasTable } from '@/lib/db/schema';
import { newId } from '@/lib/ids';
import { countUnread } from '../notifications/queries';
import { createIdea, deleteIdea } from './service';
import { listIdeas, getIdea } from './queries';

const NOW = new Date('2026-09-28T12:00:00Z');

describe.skipIf(!hasTestDb)('idea service', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  async function idea(author: 'el' | 'ea' = 'el') {
    const r = await createIdea(db, author, { title: 'Picnic', description: 'In parc' }, NOW);
    if (!r.ok) throw new Error(r.error);
    return r.value.id;
  }

  it('creates an idea and notifies the other user', async () => {
    const id = await idea('el');
    expect(await getIdea(db, id)).toMatchObject({ title: 'Picnic', author: 'el' });
    expect(await countUnread(db, 'ea')).toBe(1);
  });

  it('marks ideas used by a non-cancelled invitation', async () => {
    const used = await idea();
    const free = await idea();
    await seedInvitation(db, { ideaId: used, status: 'pending' });
    const cancelledIdea = await idea();
    await seedInvitation(db, { ideaId: cancelledIdea, status: 'cancelled' });

    const byId = Object.fromEntries((await listIdeas(db)).map((i) => [i.id, i.used]));
    expect(byId).toEqual({ [used]: true, [free]: false, [cancelledIdea]: false });
  });

  it('only lets the author delete an unused idea', async () => {
    const id = await idea('el');
    expect(await deleteIdea(db, 'ea', id)).toMatchObject({ ok: false, code: 'not_found' });
    expect((await deleteIdea(db, 'el', id)).ok).toBe(true);
    expect(await getIdea(db, id)).toBeNull();
  });

  it('refuses to delete a used idea', async () => {
    const id = await idea('el');
    await seedInvitation(db, { ideaId: id, status: 'accepted' });
    expect(await deleteIdea(db, 'el', id)).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('enforces the maximum number of ideas', async () => {
    // insert in bloc: 50 de apeluri createIdea ar insemna 150 de round-trip-uri HTTP
    await db.insert(ideasTable).values(
      Array.from({ length: LIMITS.maxIdeas }, (_, i) => ({
        id: newId(),
        author: 'el' as const,
        title: `Idee ${i}`,
        description: null,
        createdAt: NOW,
      })),
    );
    const r = await createIdea(db, 'el', { title: 'Una prea multe', description: null }, NOW);
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/ideas`
Expected: FAIL (cu baza de test).

- [ ] **Step 3: Implementeaza**

`lib/ideas/queries.ts`:

```ts
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';
import type { Db } from '../db/client';
import { ideas, invitations, type IdeaRow } from '../db/schema';
import { isUuid } from '../ids';

export interface IdeaView extends IdeaRow {
  used: boolean;
}

async function usedIdeaIds(db: Db): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ ideaId: invitations.ideaId })
    .from(invitations)
    .where(and(isNotNull(invitations.ideaId), ne(invitations.status, 'cancelled')));
  return new Set(rows.map((r) => r.ideaId).filter((id): id is string => id !== null));
}

export async function listIdeas(db: Db): Promise<IdeaView[]> {
  const [rows, used] = await Promise.all([db.select().from(ideas).orderBy(desc(ideas.createdAt)), usedIdeaIds(db)]);
  return rows.map((row) => ({ ...row, used: used.has(row.id) }));
}

export async function getIdea(db: Db, id: string): Promise<IdeaRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
  return row ?? null;
}

export async function isIdeaUsed(db: Db, id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.ideaId, id), ne(invitations.status, 'cancelled')))
    .limit(1);
  return Boolean(row);
}
```

`lib/ideas/service.ts`:

```ts
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { ideas } from '../db/schema';
import { LIMITS, otherUser, type UserId } from '../domain';
import { newId } from '../ids';
import { failure, ok, type Result } from '../result';
import type { IdeaInput } from '../validation';
import { insertNotification } from '../notifications/create';
import { getIdea, isIdeaUsed } from './queries';

export async function createIdea(db: Db, actor: UserId, input: IdeaInput, now: Date): Promise<Result<{ id: string }>> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(ideas);
  if (n >= LIMITS.maxIdeas) {
    return failure('invalid', `Aveti deja ${LIMITS.maxIdeas} de idei. Stergeti cateva mai vechi.`);
  }
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(ideas).values({ id, author: actor, title: input.title, description: input.description, createdAt: now });
    await insertNotification(tx, { recipient: otherUser(actor), type: 'idea_added', invitationId: null, now });
  });
  return ok({ id });
}

export async function deleteIdea(db: Db, actor: UserId, id: string): Promise<Result> {
  const idea = await getIdea(db, id);
  if (!idea || idea.author !== actor) return failure('not_found', 'Ideea nu exista.');
  if (await isIdeaUsed(db, idea.id)) return failure('invalid', 'Ideea a fost folosita intr-o invitatie.');
  await db.delete(ideas).where(eq(ideas.id, idea.id));
  return ok(undefined);
}
```

- [ ] **Step 4: Ruleaza testele**

Run: `npx vitest run lib/ideas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ideas
git commit -m "feat: add shared ideas service"
```

---

### Task 8: Pagina de idei si precompletarea invitatiei

**Files:**
- Create: `app/(app)/idei/actions.ts`, `app/(app)/idei/IdeaForm.tsx`, `app/(app)/idei/page.tsx`
- Modify: `app/(app)/invitatii/noua/page.tsx` (rescris)

- [ ] **Step 1: Scrie `app/(app)/idei/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { createIdea, deleteIdea } from '@/lib/ideas/service';
import { ideaSchema } from '@/lib/validation';
import { pickStrings, toFieldErrors } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, toActionState, type ActionState } from '@/lib/result';

export async function createIdeaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  const values = pickStrings(formData, ['title', 'description']);
  const parsed = ideaSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: 'Verifica ideea.', fields: toFieldErrors(parsed.error), values };
  try {
    const result = await createIdea(getDb(), actor, parsed.data, new Date());
    if (!result.ok) return { ...toActionState(result), values } as ActionState;
  } catch (err) {
    log('error', 'create_idea_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values };
  }
  revalidatePath('/idei');
  return { ok: true, message: 'Idee adaugata.' };
}

export async function deleteIdeaAction(ideaId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  const actor = await requireSession();
  try {
    const result = await deleteIdea(getDb(), actor, ideaId);
    if (!result.ok) return toActionState(result);
  } catch (err) {
    log('error', 'delete_idea_failed', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR };
  }
  revalidatePath('/idei');
  return { ok: true };
}
```

- [ ] **Step 2: Scrie `app/(app)/idei/IdeaForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import Field from '@/components/ui/Field';
import SubmitButton from '@/components/ui/SubmitButton';
import { LIMITS } from '@/lib/domain';
import { createIdeaAction } from './actions';

export default function IdeaForm() {
  const [state, formAction] = useActionState(createIdeaAction, null);
  const failed = state && !state.ok ? state : null;
  return (
    <form action={formAction} className="card form">
      <h2>Idee noua</h2>
      <Field label="Ce ai vrea sa facem?" htmlFor="idea-title" error={failed?.fields?.title}>
        <input
          id="idea-title"
          name="title"
          required
          maxLength={LIMITS.ideaTitleMax}
          defaultValue={failed?.values?.title ?? ''}
          placeholder="Picnic la apus"
        />
      </Field>
      <Field label="Detalii (optional)" htmlFor="idea-description" error={failed?.fields?.description}>
        <textarea
          id="idea-description"
          name="description"
          maxLength={LIMITS.ideaDescriptionMax}
          defaultValue={failed?.values?.description ?? ''}
        />
      </Field>
      {failed && (
        <p className="form-error" role="alert">
          {failed.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
      <SubmitButton label="Adauga ideea" />
    </form>
  );
}
```

- [ ] **Step 3: Scrie `app/(app)/idei/page.tsx`**

```tsx
import Link from 'next/link';
import ActionButtonForm from '@/components/ui/ActionButtonForm';
import { requireSession } from '@/lib/auth/require-session';
import { displayNames } from '@/lib/auth/display-names';
import { getDb } from '@/lib/db/client';
import { listIdeas } from '@/lib/ideas/queries';
import IdeaForm from './IdeaForm';
import { deleteIdeaAction } from './actions';

export default async function IdeasPage() {
  const me = await requireSession();
  const ideas = await listIdeas(getDb());
  const names = displayNames();

  return (
    <div className="stack">
      <h1>Idei de dateuri</h1>
      <IdeaForm />
      {ideas.length === 0 ? (
        <p className="card muted">Nicio idee inca. Scrie prima!</p>
      ) : (
        <ul className="grid-2 idea-list">
          {ideas.map((idea) => (
            <li key={idea.id} className="card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">De la {names[idea.author]}</span>
                {idea.used && <span className="status status-accepted">Folosita</span>}
              </div>
              <h3>{idea.title}</h3>
              {idea.description && <p className="invitation-message">{idea.description}</p>}
              <div className="row">
                {!idea.used && (
                  <Link className="btn btn-primary" href={`/invitatii/noua?idee=${idea.id}`}>
                    Fa din asta o invitatie
                  </Link>
                )}
                {idea.author === me && !idea.used && (
                  <ActionButtonForm
                    action={deleteIdeaAction.bind(null, idea.id)}
                    label="Sterge"
                    variant="danger"
                    confirmText="Stergi ideea?"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rescrie `app/(app)/invitatii/noua/page.tsx` cu precompletare**

```tsx
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import { getIdea } from '@/lib/ideas/queries';
import { toLocalInputValue } from '@/lib/time';
import InvitationForm, { type InvitationDefaults } from './InvitationForm';

export default async function NewInvitationPage({ searchParams }: { searchParams: Promise<{ idee?: string }> }) {
  await requireSession();
  const { idee } = await searchParams;
  const idea = idee ? await getIdea(getDb(), idee) : null;
  const defaults: InvitationDefaults = idea
    ? { title: idea.title, message: idea.description ?? '', ideaId: idea.id }
    : { title: '', message: '', ideaId: '' };

  return (
    <div className="stack">
      <h1>Invitatie noua</h1>
      {idea && <p className="muted">Pornita din ideea "{idea.title}".</p>}
      <InvitationForm defaults={defaults} minDateTime={toLocalInputValue(new Date())} />
    </div>
  );
}
```

- [ ] **Step 5: Adauga `.idea-list { list-style: none; }` la finalul `app/globals.css`**

- [ ] **Step 6: Typecheck si commit**

Run: `npx tsc --noEmit`
Expected: fara erori.

```bash
git add "app/(app)/idei" "app/(app)/invitatii/noua/page.tsx" app/globals.css
git commit -m "feat: add ideas page and prefill invitations from an idea"
```

---

### Task 9: Calendar

**Files:**
- Create: `lib/calendar.ts`, `app/(app)/calendar/page.tsx`
- Test: `lib/calendar.test.ts`
- Modify: `components/AppHeader.tsx`, `app/globals.css`

- [ ] **Step 1: Scrie testul**

```ts
import { describe, it, expect } from 'vitest';
import { parseMonthParam, shiftMonth, formatMonthParam, monthGrid, gridRangeUtc, monthLabelRo } from './calendar';

const NOW = new Date('2026-09-28T12:00:00Z');

describe('parseMonthParam', () => {
  it('parses YYYY-MM', () => {
    expect(parseMonthParam('2026-02', NOW)).toEqual({ year: 2026, month: 2 });
  });

  it('falls back to the current Bucharest month', () => {
    expect(parseMonthParam(undefined, NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('2026-13', NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('<script>', NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('1999-01', NOW)).toEqual({ year: 2026, month: 9 });
  });
});

describe('shiftMonth / formatMonthParam', () => {
  it('wraps years', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('monthGrid', () => {
  it('builds Monday-first weeks covering the month (September 2026)', () => {
    const weeks = monthGrid({ year: 2026, month: 9 });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ key: '2026-08-31', day: 31, inMonth: false });
    expect(weeks[0][1]).toEqual({ key: '2026-09-01', day: 1, inMonth: true });
    expect(weeks[4][6]).toEqual({ key: '2026-10-04', day: 4, inMonth: false });
  });

  it('handles a month starting on Sunday (February 2026)', () => {
    const weeks = monthGrid({ year: 2026, month: 2 });
    expect(weeks[0][6]).toEqual({ key: '2026-02-01', day: 1, inMonth: true });
  });
});

describe('gridRangeUtc', () => {
  it('spans from the first grid day to the day after the last, in Bucharest time', () => {
    const range = gridRangeUtc(monthGrid({ year: 2026, month: 9 }));
    expect(range.from.toISOString()).toBe('2026-08-30T21:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-10-04T21:00:00.000Z');
  });
});

describe('monthLabelRo', () => {
  it('names the month in Romanian', () => {
    expect(monthLabelRo({ year: 2026, month: 9 })).toBe('septembrie 2026');
  });
});
```

- [ ] **Step 2: Ruleaza, verifica ca pica**

Run: `npx vitest run lib/calendar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementeaza `lib/calendar.ts`**

```ts
import { pad2 } from './countdown';
import { localDateKey, parseLocalDateTime } from './time';

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

export interface CalendarDay {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

export function parseMonthParam(value: string | undefined, now: Date): MonthRef {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  const [year, month] = localDateKey(now).split('-').map(Number);
  return { year, month };
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function formatMonthParam(ref: MonthRef): string {
  return `${ref.year}-${pad2(ref.month)}`;
}

function keyOf(utcMs: number): { key: string; day: number; month: number } {
  const d = new Date(utcMs);
  return {
    key: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
  };
}

/** Saptamani incepand cu luni. Aritmetica pe zile calendaristice (UTC), fara ore. */
export function monthGrid(ref: MonthRef): CalendarDay[][] {
  const first = Date.UTC(ref.year, ref.month - 1, 1);
  const leading = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const start = first - leading * DAY_MS;

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i++) {
    if (i % 7 === 0) weeks.push([]);
    const { key, day, month } = keyOf(start + i * DAY_MS);
    weeks[weeks.length - 1].push({ key, day, inMonth: month === ref.month });
  }
  return weeks;
}

export function gridRangeUtc(weeks: CalendarDay[][]): { from: Date; to: Date } {
  const firstKey = weeks[0][0].key;
  const lastKey = weeks[weeks.length - 1][6].key;
  const [y, m, d] = lastKey.split('-').map(Number);
  const dayAfter = keyOf(Date.UTC(y, m - 1, d) + DAY_MS).key;
  const from = parseLocalDateTime(`${firstKey}T00:00`);
  const to = parseLocalDateTime(`${dayAfter}T00:00`);
  if (!from || !to) throw new Error('Interval de calendar invalid');
  return { from, to };
}

const monthFormatter = new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function monthLabelRo(ref: MonthRef): string {
  return monthFormatter.format(new Date(Date.UTC(ref.year, ref.month - 1, 15)));
}
```

- [ ] **Step 4: Ruleaza testul**

Run: `npx vitest run lib/calendar.test.ts`
Expected: PASS.

- [ ] **Step 5: Scrie `app/(app)/calendar/page.tsx`**

```tsx
import Link from 'next/link';
import { requireSession } from '@/lib/auth/require-session';
import { getDb } from '@/lib/db/client';
import type { InvitationRow } from '@/lib/db/schema';
import { STATUS_LABELS } from '@/lib/domain';
import { listInvitationsBetween } from '@/lib/invitations/queries';
import { formatMonthParam, gridRangeUtc, monthGrid, monthLabelRo, parseMonthParam, shiftMonth } from '@/lib/calendar';
import { formatDateTimeRo, localDateKey } from '@/lib/time';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ luna?: string }> }) {
  await requireSession();
  const { luna } = await searchParams;
  const now = new Date();
  const ref = parseMonthParam(luna, now);
  const weeks = monthGrid(ref);
  const { from, to } = gridRangeUtc(weeks);
  const invitations = await listInvitationsBetween(getDb(), from, to);

  const byDay = new Map<string, InvitationRow[]>();
  for (const inv of invitations) {
    const key = localDateKey(inv.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), inv]);
  }
  const todayKey = localDateKey(now);
  const monthPrefix = formatMonthParam(ref);
  const inThisMonth = invitations.filter((inv) => localDateKey(inv.startsAt).startsWith(monthPrefix));

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="calendar-title">{monthLabelRo(ref)}</h1>
        <div className="row">
          <Link className="btn btn-ghost" href={`/calendar?luna=${formatMonthParam(shiftMonth(ref, -1))}`}>
            ‹ Luna trecuta
          </Link>
          <Link className="btn btn-ghost" href="/calendar">
            Azi
          </Link>
          <Link className="btn btn-ghost" href={`/calendar?luna=${formatMonthParam(shiftMonth(ref, 1))}`}>
            Luna viitoare ›
          </Link>
        </div>
      </div>

      <div className="card calendar-card">
        <table className="calendar">
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((day) => (
                  <td
                    key={day.key}
                    className={`${day.inMonth ? '' : 'out'} ${day.key === todayKey ? 'today' : ''}`}
                  >
                    <span className="day-number">{day.day}</span>
                    {(byDay.get(day.key) ?? []).map((inv) => (
                      <Link key={inv.id} href={`/invitatii/${inv.id}`} className={`calendar-event status-${inv.status}`}>
                        {inv.title}
                      </Link>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="stack" aria-label="Dateurile lunii">
        <h2>In {monthLabelRo(ref)}</h2>
        {inThisMonth.length === 0 ? (
          <p className="muted">Niciun date luna aceasta.</p>
        ) : (
          <ul className="notification-list">
            {inThisMonth.map((inv) => (
              <li key={inv.id} className="card notification">
                <Link href={`/invitatii/${inv.id}`}>{inv.title}</Link>
                <span className="muted">
                  {formatDateTimeRo(inv.startsAt)} · {STATUS_LABELS[inv.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Adauga Calendar si Idei in `buildNav` din `components/AppHeader.tsx`**

Inlocuieste corpul functiei `buildNav` cu:

```ts
  return [
    { href: '/', label: 'Acasa' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/idei', label: 'Idei' },
    { href: '/invitatii/noua', label: 'Invitatie noua' },
    { href: '/notificari', label: 'Notificari', badge: unread },
  ];
```

- [ ] **Step 7: Adauga la finalul `app/globals.css`**

```css
/* Faza 3: calendar */
.calendar-title { text-transform: capitalize; }
.calendar-card { padding: 12px; overflow-x: auto; }
.calendar { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
.calendar th { font-size: 0.8rem; color: var(--ink-soft); font-weight: 600; padding: 4px; }
.calendar td { vertical-align: top; height: 92px; padding: 6px; border-radius: 12px; background: rgba(255, 255, 255, 0.55); }
.calendar td.out { opacity: 0.45; }
.calendar td.today { outline: 2px solid var(--pink-300); }
.day-number { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
.calendar-event {
  display: block; font-size: 0.75rem; padding: 2px 6px; margin-top: 2px; border-radius: 8px; text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (max-width: 640px) {
  .calendar td { height: 56px; padding: 3px; }
  .calendar-event { font-size: 0; height: 8px; padding: 0; }
}
```

(Pe mobil evenimentele devin puncte colorate; lista de sub calendar ramane sursa de text.)

- [ ] **Step 8: Verify, build, smoke**

Run: `npm run verify`
Expected: tot PASS.

Run: `npm run build`
Expected: build reusit.

Smoke manual (`npm run dev`):
1. `/idei` -> adauga o idee -> ceilalt user are badge -> "Fa din asta o invitatie" -> formular precompletat -> trimite -> ideea apare "Folosita"
2. `/calendar` -> invitatia apare in ziua ei; "Luna viitoare" / "Luna trecuta" merg; `?luna=abc` arata luna curenta
3. Pentru un date acceptat din trecut (creeaza unul cu data apropiata si asteapta, sau modifica `starts_at` direct in TiDB SQL Editor): sectiunea Amintiri apare; salveaza nota -> apare butonul de poze -> incarca o poza de pe telefon -> apare in grila
4. Copiaza URL-ul pozei (`/api/photos/...`) intr-o fereastra privata -> 401

- [ ] **Step 9: Commit**

```bash
git add lib/calendar.ts lib/calendar.test.ts "app/(app)/calendar" components/AppHeader.tsx app/globals.css
git commit -m "feat: add monthly calendar and navigation links"
```
