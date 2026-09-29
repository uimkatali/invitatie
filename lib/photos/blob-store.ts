import { put, del } from '@vercel/blob';

export interface BlobStore {
  put(pathname: string, body: Uint8Array, contentType: string): Promise<{ url: string; pathname: string }>;
  del(url: string): Promise<void>;
}

const TRUSTED_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/** Doar https si doar hostul public Vercel Blob; un rand din DB otravit nu poate produce SSRF. */
export function isTrustedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.port === '' && parsed.hostname.endsWith(TRUSTED_HOST_SUFFIX);
  } catch {
    return false;
  }
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
