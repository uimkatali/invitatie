import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { signSession, verifySession, SESSION_MAX_AGE_SECONDS } from './session';

const SECRET = 's'.repeat(32);
const NOW = new Date('2026-09-28T12:00:00Z');

describe('session', () => {
  it('round-trips the user', async () => {
    const token = await signSession('ea', SECRET, NOW);
    expect(await verifySession(token, SECRET, NOW)).toBe('ea');
  });

  it('expires after the max age', async () => {
    const token = await signSession('el', SECRET, NOW);
    const later = new Date(NOW.getTime() + (SESSION_MAX_AGE_SECONDS + 60) * 1000);
    expect(await verifySession(token, SECRET, later)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession('el', 'o'.repeat(32), NOW);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const token = await signSession('el', SECRET, NOW);
    const [h, , s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'ea', iat: 0, exp: 9999999999 })).toString('base64url');
    expect(await verifySession(`${h}.${forgedPayload}.${s}`, SECRET, NOW)).toBeNull();
  });

  it('rejects alg=none tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'el' })).toString('base64url');
    expect(await verifySession(`${header}.${payload}.`, SECRET, NOW)).toBeNull();
  });

  it('rejects an unknown subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('admin')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('returns null for missing token or short secret', async () => {
    expect(await verifySession(undefined, SECRET)).toBeNull();
    const token = await signSession('el', SECRET, NOW);
    expect(await verifySession(token, 'short', NOW)).toBeNull();
  });

  it('rejects a token signed with HS512 instead of HS256', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS512' })
      .setSubject('el')
      .setAudience('session')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it('rejects a token without the expected audience', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('el')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it('throws when signing with a secret shorter than 32 characters', async () => {
    await expect(signSession('el', 'short', NOW)).rejects.toThrow(/32/);
  });
});
