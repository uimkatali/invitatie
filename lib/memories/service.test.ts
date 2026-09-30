import { describe, it, expect, vi } from 'vitest';
import { canHaveMemories } from './service';

const NOW = new Date('2026-09-28T12:00:00Z');

describe('canHaveMemories', () => {
  it('only for accepted dates that already started', () => {
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(true);
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-10-20T17:00:00Z') }, NOW)).toBe(false);
    expect(canHaveMemories({ status: 'declined', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(false);
  });
});

describe('saveMemory retry branching', () => {
  const input = { note: 'x', rating: 4 };
  const inv = { id: 'inv-1', status: 'accepted', startsAt: new Date('2026-09-20T17:00:00Z') };

  /** Db fals: `selects` sunt rezultatele succesive ale SELECT-urilor; tranzactia arunca `txError`. */
  function fakeDb(selects: Array<Array<{ id: string }>>, txError: unknown) {
    const update = vi.fn(() => ({ set: () => ({ where: () => Promise.resolve() }) }));
    const queue = [...selects];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(queue.shift() ?? []) }) }) }),
      update,
      transaction: () => Promise.reject(txError),
    };
    return { db: db as never, update };
  }

  async function run(db: never) {
    vi.resetModules();
    vi.doMock('../invitations/queries', () => ({ getInvitation: async () => inv }));
    const { saveMemory } = await import('./service');
    return saveMemory(db, 'el', 'inv-1', input, NOW);
  }

  it.each([
    ['duplicate key', { details: { code: '1062' } }],
    ['transaction conflict', { details: { code: '9007' } }],
  ])('retries as an update on %s', async (_name, err) => {
    const { db, update } = fakeDb([[], [{ id: 'winner' }]], err);
    expect(await run(db)).toMatchObject({ ok: true, value: { memoryId: 'winner', created: false } });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('rethrows unrelated errors', async () => {
    const { db } = fakeDb([[]], new Error('boom'));
    await expect(run(db)).rejects.toThrow('boom');
  });

  it('rethrows the original error when no winning row exists', async () => {
    const { db } = fakeDb([[], []], { details: { code: '1062' } });
    await expect(run(db)).rejects.toMatchObject({ details: { code: '1062' } });
  });
});
