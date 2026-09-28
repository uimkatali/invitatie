import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

/** Aplica migrarile pe baza de test (doar daca TEST_DATABASE_URL e setat). */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  if (!/\/dates_test(\?|$)/.test(url)) {
    throw new Error('TEST_DATABASE_URL trebuie sa pointeze la baza dates_test, nu la baza reala.');
  }
  const connection = await mysql.createConnection({ uri: url });
  try {
    await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
  } finally {
    await connection.end();
  }
}
