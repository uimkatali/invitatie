import { describe, it, expect, vi, beforeEach } from 'vitest';

const sdk = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn() }));
vi.mock('@vercel/blob', () => sdk);

import { vercelBlobStore } from './blob-store';

const TOKEN = 'vercel_blob_rw_store123_secret456';

beforeEach(() => {
  sdk.put.mockReset();
  sdk.get.mockReset();
  sdk.del.mockReset();
});

describe('vercelBlobStore (private store)', () => {
  it('uploads with access "private", a random suffix and the explicit token', async () => {
    sdk.put.mockResolvedValue({ url: 'https://s.private.blob.vercel-storage.com/photos/a-xyz.jpg', pathname: 'photos/a-xyz.jpg' });
    const result = await vercelBlobStore(TOKEN).put('photos/a.jpg', new Uint8Array([1, 2, 3]), 'image/jpeg');

    expect(sdk.put).toHaveBeenCalledTimes(1);
    const [pathname, body, options] = sdk.put.mock.calls[0];
    expect(pathname).toBe('photos/a.jpg');
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(options).toMatchObject({ access: 'private', addRandomSuffix: true, contentType: 'image/jpeg', token: TOKEN });
    // Pathname-ul final (cu sufix) e cel returnat: cu el se citeste si se sterge blob-ul.
    expect(result).toEqual({ url: 'https://s.private.blob.vercel-storage.com/photos/a-xyz.jpg', pathname: 'photos/a-xyz.jpg' });
  });

  it('never uploads publicly', async () => {
    sdk.put.mockResolvedValue({ url: 'u', pathname: 'p' });
    await vercelBlobStore(TOKEN).put('photos/a.jpg', new Uint8Array([1]), 'image/jpeg');
    expect(sdk.put.mock.calls[0][2].access).not.toBe('public');
  });

  it('reads with the authenticated get by pathname and returns the stream and type', async () => {
    const stream = new Response('abc').body as ReadableStream<Uint8Array>;
    sdk.get.mockResolvedValue({ statusCode: 200, stream, headers: new Headers(), blob: { contentType: 'image/png' } });
    const controller = new AbortController();
    const result = await vercelBlobStore(TOKEN).get('photos/a-xyz.jpg', controller.signal);

    expect(sdk.get).toHaveBeenCalledWith('photos/a-xyz.jpg', {
      access: 'private',
      token: TOKEN,
      abortSignal: controller.signal,
    });
    expect(result).toEqual({ stream, contentType: 'image/png' });
  });

  it('returns null when the blob is missing or the response is not a full 200', async () => {
    sdk.get.mockResolvedValueOnce(null);
    expect(await vercelBlobStore(TOKEN).get('photos/missing.jpg')).toBeNull();
    sdk.get.mockResolvedValueOnce({ statusCode: 304, stream: null, headers: new Headers(), blob: { contentType: null } });
    expect(await vercelBlobStore(TOKEN).get('photos/cached.jpg')).toBeNull();
  });

  it('lets SDK errors propagate (the caller maps them to a generic 502)', async () => {
    sdk.get.mockRejectedValue(new Error('Failed to fetch blob: 403 Forbidden'));
    await expect(vercelBlobStore(TOKEN).get('photos/a.jpg')).rejects.toThrow('403');
  });

  it('deletes by pathname with the explicit token', async () => {
    sdk.del.mockResolvedValue(undefined);
    await vercelBlobStore(TOKEN).del('photos/a-xyz.jpg');
    expect(sdk.del).toHaveBeenCalledWith('photos/a-xyz.jpg', { token: TOKEN });
  });
});
