import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { signSession, SESSION_COOKIE } from './lib/auth/session';

const SECRET = 'p'.repeat(32);

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
    const res = await proxy(new NextRequest('http://localhost/api/photos/x'));
    expect(res.status).toBe(401);
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
  });

  it('treats a forged cookie as no session', async () => {
    const req = new NextRequest('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=forged.token.value` } });
    const res = await proxy(req);
    expect(res.status).toBe(307);
  });
});
