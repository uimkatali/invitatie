import { describe, it, expect, beforeEach } from 'vitest';
import { hasTestDb, testDb, resetDb } from './db';
import { ideas } from '@/lib/db/schema';
import { newId } from '@/lib/ids';

describe.skipIf(!hasTestDb)('test database', () => {
  const db = hasTestDb ? testDb() : (null as never);

  beforeEach(async () => {
    await resetDb(db);
  });

  it('round-trips a row with a UTC datetime', async () => {
    const createdAt = new Date('2026-09-28T18:30:00.000Z');
    const id = newId();
    await db.insert(ideas).values({ id, author: 'el', title: 'Picnic', description: null, createdAt });
    const rows = await db.select().from(ideas);
    expect(rows).toHaveLength(1);
    expect(rows[0].createdAt.toISOString()).toBe(createdAt.toISOString());
  });
});
