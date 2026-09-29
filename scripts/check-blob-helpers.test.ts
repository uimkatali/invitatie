import { describe, it, expect } from 'vitest';
import { tokenProblem, anonymousVerdict, redact } from './check-blob-helpers.mjs';

describe('tokenProblem', () => {
  it('accepts a read-write token shape', () => {
    expect(tokenProblem('vercel_blob_rw_abc123XYZ_secretpart987')).toBeNull();
  });

  it.each([undefined, '', '   '])('reports a missing token for %j', (value) => {
    expect(tokenProblem(value)).toBe('missing');
  });

  it.each(['deocamdata', 'xxx', 'your-token-here', 'vercel_blob_rw_', 'vercel_blob_rw_onlystore', 'e2e-no-blob'])(
    'reports a placeholder for %j',
    (value) => {
      expect(tokenProblem(value)).toBe('placeholder');
    },
  );
});

describe('anonymousVerdict', () => {
  it('passes for refusals and redirects, fails for any 2xx', () => {
    for (const status of [400, 401, 403, 404]) expect(anonymousVerdict(status)).toBe('pass');
    for (const status of [200, 204, 206]) expect(anonymousVerdict(status)).toBe('public');
  });

  it('treats an unexpected non-refusal as inconclusive rather than a pass', () => {
    expect(anonymousVerdict(302)).toBe('unclear');
    expect(anonymousVerdict(500)).toBe('unclear');
  });
});

describe('redact', () => {
  it('removes the token and any blob URL from a message', () => {
    const token = 'vercel_blob_rw_abc123_secretpart';
    const text = `boom ${token} at https://abc123.private.blob.vercel-storage.com/healthcheck/x.png done`;
    const out = redact(text, token);
    expect(out).not.toContain('secretpart');
    expect(out).not.toContain('blob.vercel-storage.com');
    expect(out).toContain('boom');
  });

  it('also strips any token-shaped string and truncates long messages', () => {
    expect(redact('x vercel_blob_rw_other_zzz y', 'unrelated')).not.toContain('zzz');
    expect(redact('a'.repeat(1000), 't').length).toBeLessThanOrEqual(200);
  });
});
