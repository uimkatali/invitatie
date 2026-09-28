import { SignJWT, jwtVerify } from 'jose';
import { isUserId, type UserId } from '../domain';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(user: UserId, secret: string, now: Date = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(key(secret));
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<UserId | null> {
  if (!token || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'], currentDate: now });
    return isUserId(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
