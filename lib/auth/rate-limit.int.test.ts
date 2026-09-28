import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from '@/test/db';
import { getAttempts, recordFailure, clearAttempts } from './rate-limit';

describe.skipIf(!hasTestDb)('rate limit persistence', () => {
  const db = hasTestDb ? testDb() : (null as never);
  const ipHash = 'a'.repeat(64);
  const now = new Date('2026-09-28T12:00:00Z');

  beforeEach(async () => {
    await resetDb(db);
  });

  it('records failures and clears them', async () => {
    expect(await getAttempts(db, ipHash)).toBeNull();
    await recordFailure(db, ipHash, now);
    await recordFailure(db, ipHash, now);
    expect((await getAttempts(db, ipHash))?.count).toBe(2);
    await clearAttempts(db, ipHash);
    expect(await getAttempts(db, ipHash)).toBeNull();
  });
});
