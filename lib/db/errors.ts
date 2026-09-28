/**
 * Forme de eroare pe care le poate arunca driverul HTTP @tidbcloud/serverless
 * (DatabaseError: `{ message, status, details: { message, code } | null }`) sau alte
 * drivere MySQL-like (ex. mysql2, folosit doar la `drizzle-kit migrate`). Le tratam
 * ca simple obiecte, fara sa importam clasele driverului aici.
 */
interface DriverErrorShape {
  message?: unknown;
  code?: unknown;
  details?: { code?: unknown; message?: unknown } | null;
}

function driverErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as DriverErrorShape;
  const code = e.details?.code ?? e.code;
  return code === undefined || code === null ? null : String(code);
}

function driverErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as DriverErrorShape;
  if (typeof e.details?.message === 'string') return e.details.message;
  if (typeof e.message === 'string') return e.message;
  return '';
}

// 9007: TiDB "write conflict" (tranzactie optimista respinsa).
// 1213: MySQL/TiDB "deadlock found when trying to get lock".
const CONFLICT_CODES = new Set(['9007', '1213']);
const CONFLICT_MESSAGE = /write conflict|deadlock found/i;

/**
 * true daca eroarea vine dintr-un conflict de tranzactie (scriere concurenta sau
 * deadlock) si nu dintr-o problema reala cu datele. Apelantul o trateaza la fel ca
 * un UPDATE care a afectat 0 randuri: cineva a schimbat inregistrarea intre timp.
 */
export function isTxConflict(err: unknown): boolean {
  const code = driverErrorCode(err);
  if (code !== null && CONFLICT_CODES.has(code)) return true;
  return CONFLICT_MESSAGE.test(driverErrorMessage(err));
}

// 1452: MySQL/TiDB "cannot add or update a child row: a foreign key constraint fails".
const FK_VIOLATION_CODE = '1452';
const FK_VIOLATION_MESSAGE = /foreign key constraint fails/i;

/**
 * true daca INSERT-ul a esuat pentru ca o cheie straina (ex. idea_id) nu mai exista -
 * de exemplu ideea a fost stearsa intre validarea din service si INSERT-ul propriu-zis.
 */
export function isForeignKeyViolation(err: unknown): boolean {
  const code = driverErrorCode(err);
  if (code === FK_VIOLATION_CODE) return true;
  return FK_VIOLATION_MESSAGE.test(driverErrorMessage(err));
}
