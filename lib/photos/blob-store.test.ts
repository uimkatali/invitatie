import { describe, it, expect } from 'vitest';
import { isTrustedBlobUrl } from './blob-store';

describe('isTrustedBlobUrl', () => {
  it('accepts https urls on the Vercel Blob public host', () => {
    expect(isTrustedBlobUrl('https://abc123.public.blob.vercel-storage.com/photos/x.jpg')).toBe(true);
  });

  it('rejects other hosts, look-alikes and non-https schemes', () => {
    expect(isTrustedBlobUrl('https://evil.example/photos/x.jpg')).toBe(false);
    expect(isTrustedBlobUrl('https://public.blob.vercel-storage.com.evil.example/x')).toBe(false);
    expect(isTrustedBlobUrl('https://evilpublic.blob.vercel-storage.com/x')).toBe(false);
    expect(isTrustedBlobUrl('https://abc.public.blob.vercel-storage.com@evil.example/x')).toBe(false);
    expect(isTrustedBlobUrl('http://abc.public.blob.vercel-storage.com/x')).toBe(false);
    expect(isTrustedBlobUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isTrustedBlobUrl('')).toBe(false);
    expect(isTrustedBlobUrl('not a url')).toBe(false);
  });
});
