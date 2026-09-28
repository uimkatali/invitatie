import { SignJWT, jwtVerify } from 'jose';
import { isUserId, type UserId } from '../domain';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_AUDIENCE = 'session';

/**
 * Verificare comuna a lungimii secretului: signSession o lasa sa arunce (o parola/secret
 * prea scurt e o eroare de configurare, nu un token invalid), verifySession o prinde si
 * intoarce null (un token nu poate fi de vina pentru un secret slab).
 */
function assertSecretLength(secret: string): void {
  if (secret.length < 32) throw new Error('SESSION_SECRET trebuie sa aiba minim 32 de caractere');
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSession(user: UserId, secret: string, now: Date = new Date()): Promise<string> {
  assertSecretLength(secret);
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(key(secret));
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<UserId | null> {
  if (!token) return null;
  try {
    assertSecretLength(secret);
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ['HS256'],
      audience: SESSION_AUDIENCE,
      requiredClaims: ['exp', 'sub'],
      currentDate: now,
    });
    return isUserId(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
