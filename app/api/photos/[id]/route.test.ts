import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getPhotoForViewing: vi.fn(),
  blobGet: vi.fn(),
}));

vi.mock('@/lib/auth/require-session', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/db/client', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/env', () => ({ env: () => ({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_store123_secret456' }) }));
vi.mock('@/lib/photos/service', () => ({ getPhotoForViewing: mocks.getPhotoForViewing }));
vi.mock('@/lib/photos/blob-store', () => ({ vercelBlobStore: () => ({ get: mocks.blobGet }) }));

import { GET } from './route';

const ID = '11111111-1111-4111-8111-111111111111';
const call = () => GET(new Request(`http://localhost/api/photos/${ID}`), { params: Promise.resolve({ id: ID }) });
const bodyStream = () => new Response(new Uint8Array([1, 2, 3])).body as ReadableStream<Uint8Array>;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.getSessionUser.mockReset().mockResolvedValue('ea');
  mocks.getPhotoForViewing.mockReset().mockResolvedValue({ pathname: 'photos/m/p.jpg', contentType: 'image/jpeg' });
  mocks.blobGet.mockReset().mockResolvedValue({ stream: bodyStream(), contentType: 'application/octet-stream' });
});

describe('GET /api/photos/[id]', () => {
  it('answers 401 without a session and never touches the database or the blob', async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(mocks.getPhotoForViewing).not.toHaveBeenCalled();
    expect(mocks.blobGet).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown photo', async () => {
    mocks.getPhotoForViewing.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(404);
    expect(mocks.blobGet).not.toHaveBeenCalled();
  });

  it('streams the private blob by pathname with hardened headers and the DB content type', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(mocks.blobGet).toHaveBeenCalledWith('photos/m/p.jpg', expect.any(AbortSignal));
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('private, max-age=300');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(res.headers.get('content-disposition')).toBe('inline');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('answers 502 with an empty body when the blob is missing in the store', async () => {
    mocks.blobGet.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('');
  });

  it('answers 502 with an empty body when the SDK fails, without leaking the error', async () => {
    mocks.blobGet.mockRejectedValue(new Error('Failed to fetch blob: 403 https://s.private.blob.vercel-storage.com/photos/m/p.jpg'));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('');
  });

  it('answers 500 with an empty body on an unexpected database error, and logs no message text', async () => {
    mocks.getPhotoForViewing.mockRejectedValue(new Error('secret-detail'));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('');
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('photo_stream_failed');
    expect(logged).not.toContain('secret-detail');
  });
});
