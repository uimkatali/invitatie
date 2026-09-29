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
