import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const EXPIRY = '7d';

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(toKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<{ valid: boolean }> {
  try {
    await jwtVerify(token, toKey(secret));
    return { valid: true };
  } catch {
    return { valid: false };
  }
}
