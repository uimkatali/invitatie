import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BlobStore } from './blob-store';

const MEMORY_ID = '11111111-1111-4111-8111-111111111111';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const NOW = new Date('2026-09-28T12:00:00Z');

vi.mock('../invitations/queries', () => ({
  getInvitation: async () => ({ id: 'inv', status: 'accepted', startsAt: new Date('2026-09-10T17:00:00Z') }),
}));

/** Db fals: SELECT memorie, SELECT count, apoi INSERT care esueaza. */
function fakeDb(insertError: unknown) {
  const results: unknown[][] = [[{ id: MEMORY_ID, author: 'ea', invitationId: 'inv' }], [{ n: 0 }]];
  const select = () => {
    const rows = results.shift() ?? [];
    const chain = { from: () => chain, where: () => chain, limit: () => Promise.resolve(rows), then: (r: (v: unknown) => unknown) => Promise.resolve(rows).then(r) };
    return chain;
  };
  return { select, insert: () => ({ values: () => Promise.reject(insertError) }) } as never;
}

describe('addPhoto cleanup', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deletes the blob and rethrows the ORIGINAL error when the insert fails', async () => {
    const { addPhoto } = await import('./service');
    const del = vi.fn(async () => {});
    const store: BlobStore = { put: async (pathname) => ({ url: 'https://x.blob.test/a', pathname }), del };
    const original = new Error('insert failed');
    await expect(addPhoto(fakeDb(original), store, 'ea', MEMORY_ID, { bytes: JPEG, width: null, height: null }, NOW)).rejects.toBe(original);
    expect(del).toHaveBeenCalledWith('https://x.blob.test/a');
  });

  it('still rethrows the original error when the cleanup deletion also fails', async () => {
    const { addPhoto } = await import('./service');
    const store: BlobStore = {
      put: async (pathname) => ({ url: 'https://x.blob.test/a', pathname }),
      del: async () => {
        throw new Error('del failed');
      },
    };
    const original = new Error('insert failed');
    await expect(addPhoto(fakeDb(original), store, 'ea', MEMORY_ID, { bytes: JPEG, width: null, height: null }, NOW)).rejects.toBe(original);
  });
});
