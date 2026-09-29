import applyMigrations from '../test/global-setup';
import { testDb, resetDb } from '../test/db';

export default async function globalSetup() {
  // applyMigrations refuza sa ruleze (arunca) daca TEST_DATABASE_URL nu se termina in /dates_test,
  // deci resetDb de mai jos nu ajunge niciodata pe baza reala.
  await applyMigrations();
  await resetDb(testDb());
}
