import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'test-secret-at-least-32-characters-long';

describe('createSessionToken / verifySessionToken', () => {
  it('creates a token that verifies as valid', async () => {
    const token = await createSessionToken(SECRET);
    const result = await verifySessionToken(token, SECRET);
    expect(result.valid).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(SECRET);
    const result = await verifySessionToken(token, 'a-completely-different-secret-value');
    expect(result.valid).toBe(false);
  });

  it('rejects a garbage string', async () => {
    const result = await verifySessionToken('not-a-real-token', SECRET);
    expect(result.valid).toBe(false);
  });

  it('rejects an expired token', async () => {
    const { SignJWT } = await import('jose');
    const key = new TextEncoder().encode(SECRET);
    const expiredToken = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 500) // expired 500s ago
      .sign(key);
    const result = await verifySessionToken(expiredToken, SECRET);
    expect(result.valid).toBe(false);
  });
});
