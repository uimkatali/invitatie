import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { getAttempts, reserveAttempt, exceedsLimit, clearAttempts, RATE_LIMIT_WINDOW_MS } from './rate-limit';

describe.skipIf(!hasTestDb)('rate limit persistence', () => {
  const db = hasTestDb ? testDb() : (null as never);
  const ipHash = 'a'.repeat(64);
  const now = new Date('2026-09-28T12:00:00Z');

  beforeEach(async () => {
    await resetDb(db);
  });

  it('increments sequentially and resets once the window passes', async () => {
    expect(await getAttempts(db, ipHash)).toBeNull();

    for (let i = 1; i <= 6; i++) {
      expect(await reserveAttempt(db, ipHash, now)).toBe(i);
    }
    expect(exceedsLimit(6)).toBe(true);

    const afterWindow = new Date(now.getTime() + RATE_LIMIT_WINDOW_MS + 60_000);
    expect(await reserveAttempt(db, ipHash, afterWindow)).toBe(1);
  });

  it('does not lose updates under concurrent reservations', async () => {
    await Promise.all(Array.from({ length: 10 }, () => reserveAttempt(db, ipHash, now)));
    expect((await getAttempts(db, ipHash))?.count).toBe(10);
  });

  it('clears attempts', async () => {
    await reserveAttempt(db, ipHash, now);
    await clearAttempts(db, ipHash);
    expect(await getAttempts(db, ipHash)).toBeNull();
  });
});
