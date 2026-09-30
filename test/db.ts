import { createDb, type Db } from '@/lib/db/client';
import { photos, memories, notifications, invitations, ideas, loginAttempts } from '@/lib/db/schema';

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export function testDb(): Db {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL lipseste');
  return createDb(url);
}

/** Goleste toate tabelele, in ordinea FK-urilor. */
export async function resetDb(db: Db): Promise<void> {
  await db.delete(photos);
  await db.delete(memories);
  await db.delete(notifications);
  await db.delete(invitations);
  await db.delete(ideas);
  await db.delete(loginAttempts);
}
