import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { signSession, SESSION_COOKIE } from './lib/auth/session';

const SECRET = 'p'.repeat(32);
const PHOTO_ID = '11111111-1111-4111-8111-111111111111';

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

async function withSession(url: string) {
  const token = await signSession('el', SECRET);
  return new NextRequest(url, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
}

describe('proxy', () => {
  it('redirects pages to /login without a session', async () => {
    const res = await proxy(new NextRequest('http://localhost/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('returns 401 for api routes without a session', async () => {
    const res = await proxy(new NextRequest('http://localhost/api/blob-upload', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('returns 401 for photos without a session, with the strict photo CSP', async () => {
    const res = await proxy(new NextRequest(`http://localhost/api/photos/${PHOTO_ID}`));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
  });

  it('lets an authenticated photo GET through with the strict photo CSP', async () => {
    const res = await proxy(await withSession(`http://localhost/api/photos/${PHOTO_ID}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(res.headers.get('x-middleware-request-x-nonce')).toBeNull();
  });

  it('lets /login through without a session, with a CSP nonce', async () => {
    const res = await proxy(new NextRequest('http://localhost/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  });

  it('redirects /login to / when already logged in', async () => {
    const res = await proxy(await withSession('http://localhost/login'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('lets authenticated requests through', async () => {
    const res = await proxy(await withSession('http://localhost/'));
    expect(res.status).toBe(200);
    // NextResponse.next({ request: { headers } }) surfaces the forwarded request headers
    // on the response as x-middleware-request-<header>.
    expect(res.headers.get('x-middleware-request-content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
  });

  it('treats a forged cookie as no session', async () => {
    const req = new NextRequest('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=forged.token.value` } });
    const res = await proxy(req);
    expect(res.status).toBe(307);
  });

  it('lets an unauthenticated Server Action POST through (the action itself calls requireSession())', async () => {
    const req = new NextRequest('http://localhost/', { method: 'POST', headers: { 'next-action': 'abc123' } });
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBeTruthy();
    expect(res.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
  });

  it('lets an unauthenticated POST to /login through', async () => {
    const req = new NextRequest('http://localhost/login', { method: 'POST' });
    const res = await proxy(req);
    expect(res.status).toBe(200);
  });

  it('logs once and fails closed when SESSION_SECRET is invalid, even for a validly-signed token', async () => {
    const validToken = await signSession('el', SECRET);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      const req = new NextRequest('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=${validToken}` } });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('session_secret_invalid'));
    } finally {
      process.env.SESSION_SECRET = original;
      errorSpy.mockRestore();
    }
  });
});
