import { createHmac } from 'node:crypto';
import { eq, sql, getTableName, type SQL } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { loginAttempts } from '../db/schema';

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 5;

export interface AttemptWindow {
  windowStart: Date;
  count: number;
}

/** IP-ul brut nu se stocheaza: doar un HMAC legat de SESSION_SECRET (nu un hash simplu, ca sa nu poata fi brute-forced offline). */
export function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

/** 'YYYY-MM-DD HH:MM:SS' UTC. Parametrii dintr-un sql`` nu trec prin maparea de tip a coloanei datetime, deci ii formatam explicit. */
export function toSqlDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function getAttempts(db: DbOrTx, ipHash: string): Promise<AttemptWindow | null> {
  const [row] = await db
    .select({ windowStart: loginAttempts.windowStart, count: loginAttempts.count })
    .from(loginAttempts)
    .where(eq(loginAttempts.ipHash, ipHash))
    .limit(1);
  return row ?? null;
}

const tableId = sql.identifier(getTableName(loginAttempts));
const ipHashId = sql.identifier(loginAttempts.ipHash.name);
const windowStartId = sql.identifier(loginAttempts.windowStart.name);
const countId = sql.identifier(loginAttempts.count.name);

/**
 * Construieste (fara sa execute) statement-ul brut de rezervare atomica a unei incercari.
 *
 * Scris ca `sql` bruta (nu prin query builder-ul `.onDuplicateKeyUpdate({ set })`): drizzle
 * ordoneaza intotdeauna asignarile dintr-un `set` dupa ordinea de DECLARARE a coloanelor in
 * schema (vezi `mysql-core/dialect.js#buildUpdateSet`), nu dupa ordinea cheilor din obiectul
 * `set` primit -- deci nu putem controla ordinea SET-urilor doar rearanjand `set: {...}`.
 *
 * Exportata separat ca sa poata fi verificata ordinea SET-urilor intr-un test unitar, folosind
 * `MySqlDialect#sqlToQuery` (fara sa fie nevoie de o conexiune reala la baza de date).
 *
 * IMPORTANT: `count` trebuie asignat inaintea lui `window_start`. MySQL/TiDB evalueaza
 * asignarile dintr-un ON DUPLICATE KEY UPDATE in ordine, de la stanga la dreapta, iar
 * expresia lui `count` citeste `window_start`: daca `window_start` ar fi fost deja
 * suprascris de o asignare anterioara, `count` ar vedea valoarea noua in loc de cea
 * stocata si nu ar mai putea decide corect daca fereastra a expirat.
 */
export function buildReserveAttemptQuery(ipHash: string, now: Date): SQL {
  const cutoff = toSqlDateTime(new Date(now.getTime() - RATE_LIMIT_WINDOW_MS));
  const nowValue = toSqlDateTime(now);
  return sql`insert into ${tableId} (${ipHashId}, ${windowStartId}, ${countId})
    values (${ipHash}, ${nowValue}, 1)
    on duplicate key update
      ${countId} = IF(${windowStartId} <= ${cutoff}, 1, ${countId} + 1),
      ${windowStartId} = IF(${windowStartId} <= ${cutoff}, ${nowValue}, ${windowStartId})`;
}

/**
 * Rezerva atomic o incercare de login, INAINTE de verificarea parolei: un singur
 * INSERT ... ON DUPLICATE KEY UPDATE, fara citire-apoi-scriere (care ar pierde
 * actualizari sub cereri paralele). Intoarce numarul de incercari din fereastra curenta.
 */
export async function reserveAttempt(db: DbOrTx, ipHash: string, now: Date): Promise<number> {
  await db.execute(buildReserveAttemptQuery(ipHash, now));
  const row = await getAttempts(db, ipHash);
  return row?.count ?? 1;
}

export function exceedsLimit(count: number): boolean {
  return count > RATE_LIMIT_MAX_FAILURES;
}

export async function clearAttempts(db: DbOrTx, ipHash: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.ipHash, ipHash));
}
