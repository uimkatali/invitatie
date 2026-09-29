import { dbErrorCode, dbErrorKind } from './db/errors';

type Level = 'info' | 'warn' | 'error';

/**
 * Log JSON pe stdout (apare in Vercel Logs).
 * Nu trimite aici parole, token-uri, hash-uri sau continutul mesajelor.
 */
export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'UnknownError';
}

/**
 * Campurile de log pentru o eroare prinsa, fara continut necontrolat:
 * - `reason`: numele erorii;
 * - `detail`: mesajul, DOAR pentru EnvError (contine numele variabilelor, niciodata valorile);
 * - `dbCode` / `dbKind`: errno-ul MySQL si o eticheta scurta, cand exista.
 * Orice alt mesaj (ex. "Failed query" al drizzle, cu parametrii) nu apare niciodata.
 */
export function errorInfo(err: unknown): Record<string, unknown> {
  const info: Record<string, unknown> = { reason: errorName(err) };
  if (err instanceof Error && err.name === 'EnvError') info.detail = err.message;
  const dbCode = dbErrorCode(err);
  if (dbCode !== null) {
    info.dbCode = dbCode;
    info.dbKind = dbErrorKind(err);
  }
  return info;
}
