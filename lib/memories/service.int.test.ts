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

  it('survives a concurrent double-save for the same author', async () => {
    const invitationId = await seedInvitation(db);
    const [a, b] = await Promise.all([
      saveMemory(db, 'el', invitationId, { note: 'A', rating: 5 }, NOW),
      saveMemory(db, 'el', invitationId, { note: 'B', rating: 4 }, NOW),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(await listMemories(db, invitationId)).toHaveLength(1);
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
