import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { loginAttempts } from '../db/schema';

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 5;

export interface AttemptWindow {
  windowStart: Date;
  count: number;
}

function windowExpired(row: AttemptWindow, now: Date): boolean {
  return now.getTime() - row.windowStart.getTime() >= RATE_LIMIT_WINDOW_MS;
}

export function isBlocked(row: AttemptWindow | null, now: Date): boolean {
  return row !== null && !windowExpired(row, now) && row.count >= RATE_LIMIT_MAX_FAILURES;
}

export function afterFailure(row: AttemptWindow | null, now: Date): AttemptWindow {
  if (!row || windowExpired(row, now)) return { windowStart: now, count: 1 };
  return { windowStart: row.windowStart, count: row.count + 1 };
}

/** IP-ul brut nu se stocheaza: doar un hash legat de SESSION_SECRET. */
export function hashIp(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
}

export async function getAttempts(db: DbOrTx, ipHash: string): Promise<AttemptWindow | null> {
  const [row] = await db
    .select({ windowStart: loginAttempts.windowStart, count: loginAttempts.count })
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, ipHash))
    .limit(1);
  return row ?? null;
}

export async function recordFailure(db: DbOrTx, ipHash: string, now: Date): Promise<void> {
  const next = afterFailure(await getAttempts(db, ipHash), now);
  await db
    .insert(loginAttempts)
    .values({ ipHash, ...next })
    .onDuplicateKeyUpdate({ set: { windowStart: next.windowStart, count: next.count } });
}

export async function clearAttempts(db: DbOrTx, ipHash: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
