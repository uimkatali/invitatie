import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';
import { env } from '../env';

/**
 * Driverul HTTP TiDB: fara pool si fara handshake TCP/TLS la fiecare cold start.
 * Parametrii de query (ex. ?ssl=...) sunt pentru mysql2 / drizzle-kit, driverul HTTP nu ii foloseste.
 */
export function createDb(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.search = '';
  const client = connect({ url: url.toString() });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

let db: Db | null = null;

export function getDb(): Db {
  if (!db) db = createDb(env().DATABASE_URL);
  return db;
}

/**
 * Numarul de randuri afectate de un UPDATE/DELETE, indiferent de forma exacta a
 * rezultatului. Driverul @tidbcloud/serverless (folosit la runtime) intoarce un
 * `FullResult` cu `rowsAffected: number | null`; pastram si un fallback pentru un
 * `ResultSetHeader`-like cu `affectedRows: number`, forma folosita de mysql2 (driverul
 * din spatele lui `drizzle-kit migrate`, nu al testelor). Nicio forma recunoscuta => 0.
 */
export function affectedRows(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const r = result as { rowsAffected?: number | null; affectedRows?: number | null };
  if (typeof r.rowsAffected === 'number') return r.rowsAffected;
  if (typeof r.affectedRows === 'number') return r.affectedRows;
  return 0;
}
