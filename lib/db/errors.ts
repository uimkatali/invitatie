/**
 * Forme de eroare pe care le poate arunca driverul HTTP @tidbcloud/serverless
 * (DatabaseError: `{ message, status, details: { message, code } | null }`) sau alte
 * drivere MySQL-like (ex. mysql2, folosit doar la `drizzle-kit migrate`). Drizzle imbraca
 * eroarea driverului intr-un DrizzleQueryError ("Failed query: ...") si o pune pe `.cause`.
 * Le tratam ca simple obiecte, fara sa importam clasele driverului aici.
 *
 * La driverul HTTP, `details.code` e un cod al API-ului TiDB Cloud (ex. 61100002), nu errno-ul
 * MySQL; errno-ul e in text: "Execute SQL fail: Error 1062 (23000): Duplicate entry ...".
 */
interface DriverErrorShape {
  message?: unknown;
  code?: unknown;
  details?: { code?: unknown; message?: unknown } | null;
  cause?: unknown;
}

const MAX_CAUSE_DEPTH = 5;
const ERRNO_IN_MESSAGE = /Error (\d+) \(/;

interface ErrorFacts {
  codes: Set<string>;
  messages: string[];
}

/** Coduri explicite si mesaje de pe fiecare nivel al lantului `cause` (cu limita si garda de cicluri). */
function collectFacts(err: unknown): ErrorFacts {
  const facts: ErrorFacts = { codes: new Set(), messages: [] };
  const seen = new Set<unknown>();
  let current: unknown = err;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current && typeof current === 'object' && !seen.has(current); depth++) {
    seen.add(current);
    const e = current as DriverErrorShape;
    for (const code of [e.details?.code, e.code]) {
      if (code !== undefined && code !== null) facts.codes.add(String(code));
    }
    for (const text of [e.details?.message, e.message]) {
      if (typeof text !== 'string' || text === '') continue;
      facts.messages.push(text);
      const errno = ERRNO_IN_MESSAGE.exec(text)?.[1];
      if (errno) facts.codes.add(errno);
    }
    current = e.cause;
  }
  return facts;
}

function matches(err: unknown, errnos: ReadonlySet<string>, messagePattern: RegExp): boolean {
  const { codes, messages } = collectFacts(err);
  for (const code of codes) if (errnos.has(code)) return true;
  return messages.some((m) => messagePattern.test(m));
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
  return matches(err, CONFLICT_CODES, CONFLICT_MESSAGE);
}

// 1452: MySQL/TiDB "cannot add or update a child row: a foreign key constraint fails".
const FK_VIOLATION_CODES = new Set(['1452']);
const FK_VIOLATION_MESSAGE = /foreign key constraint fails/i;

/**
 * true daca INSERT-ul a esuat pentru ca o cheie straina (ex. idea_id) nu mai exista -
 * de exemplu ideea a fost stearsa intre validarea din service si INSERT-ul propriu-zis.
 */
export function isForeignKeyViolation(err: unknown): boolean {
  return matches(err, FK_VIOLATION_CODES, FK_VIOLATION_MESSAGE);
}

// 1062: MySQL/TiDB "duplicate entry for key" (incalcare de UNIQUE / PRIMARY KEY).
const DUPLICATE_KEY_CODES = new Set(['1062']);
const DUPLICATE_KEY_MESSAGE = /duplicate entry/i;

/**
 * true daca INSERT-ul a esuat pentru ca exista deja un rand cu aceeasi cheie unica
 * (ex. doua salvari concurente ale aceleiasi amintiri, UNIQUE (invitation_id, author)).
 */
export function isDuplicateKey(err: unknown): boolean {
  return matches(err, DUPLICATE_KEY_CODES, DUPLICATE_KEY_MESSAGE);
}
