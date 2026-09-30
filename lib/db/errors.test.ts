import { describe, it, expect } from 'vitest';
import { isForeignKeyViolation, isTxConflict, isDuplicateKey, dbErrorCode, dbErrorKind } from './errors';

describe('isTxConflict', () => {
  it('recognizes a TiDB write-conflict DatabaseError (code 9007)', () => {
    expect(isTxConflict({ message: 'write conflict', details: { code: '9007', message: 'Write conflict' } })).toBe(true);
  });

  it('recognizes a deadlock DatabaseError (code 1213)', () => {
    expect(isTxConflict({ message: 'deadlock', details: { code: '1213', message: 'Deadlock found when trying to get lock' } })).toBe(
      true,
    );
  });

  it('recognizes a numeric details.code too', () => {
    expect(isTxConflict({ details: { code: 9007 } })).toBe(true);
  });

  it('falls back to matching the message when there is no details.code', () => {
    expect(isTxConflict({ message: 'Deadlock found when trying to get lock; try restarting transaction' })).toBe(true);
    expect(isTxConflict(new Error('Write conflict, txnStartTS is stale'))).toBe(true);
  });

  it('rejects an unrelated error code', () => {
    expect(isTxConflict({ details: { code: '1062', message: 'Duplicate entry' } })).toBe(false);
  });

  it('rejects a plain error unrelated to conflicts', () => {
    expect(isTxConflict(new Error('boom'))).toBe(false);
  });

  it('is false for non-error, non-object, or empty values', () => {
    expect(isTxConflict(null)).toBe(false);
    expect(isTxConflict(undefined)).toBe(false);
    expect(isTxConflict('nope')).toBe(false);
    expect(isTxConflict({})).toBe(false);
  });
});

describe('isForeignKeyViolation', () => {
  it('recognizes a MySQL FK violation (code 1452)', () => {
    expect(
      isForeignKeyViolation({
        message: 'foreign key constraint fails',
        details: { code: '1452', message: 'Cannot add or update a child row: a foreign key constraint fails' },
      }),
    ).toBe(true);
  });

  it('recognizes a numeric details.code too', () => {
    expect(isForeignKeyViolation({ details: { code: 1452 } })).toBe(true);
  });

  it('falls back to matching the message when there is no details.code', () => {
    expect(isForeignKeyViolation(new Error('a foreign key constraint fails'))).toBe(true);
  });

  it('rejects an unrelated error code', () => {
    expect(isForeignKeyViolation({ details: { code: '1062', message: 'Duplicate entry' } })).toBe(false);
  });

  it('rejects a plain error unrelated to foreign keys', () => {
    expect(isForeignKeyViolation(new Error('boom'))).toBe(false);
  });

  it('is false for non-error, non-object, or empty values', () => {
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation(undefined)).toBe(false);
    expect(isForeignKeyViolation('nope')).toBe(false);
    expect(isForeignKeyViolation({})).toBe(false);
  });
});

describe('isDuplicateKey', () => {
  it('recognizes code 1062 in details.code (string or number)', () => {
    expect(isDuplicateKey({ details: { code: '1062', message: 'Duplicate entry' } })).toBe(true);
    expect(isDuplicateKey({ details: { code: 1062 } })).toBe(true);
  });

  it('recognizes a top-level code (mysql2 style)', () => {
    expect(isDuplicateKey({ code: 1062 })).toBe(true);
  });

  it('falls back to matching the message', () => {
    expect(isDuplicateKey(new Error("Duplicate entry 'a-el' for key 'uq'"))).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isDuplicateKey({ details: { code: '1452', message: 'foreign key constraint fails' } })).toBe(false);
    expect(isDuplicateKey(new Error('boom'))).toBe(false);
    expect(isDuplicateKey(null)).toBe(false);
    expect(isDuplicateKey('nope')).toBe(false);
    expect(isDuplicateKey({})).toBe(false);
  });
});

/** Forma reala: DrizzleQueryError (mesaj "Failed query") cu DatabaseError-ul driverului pe `cause`. */
function drizzleWrapped(mysqlMessage: string) {
  const driver = { message: 'fail', status: 400, details: { code: 61100002, message: `Execute SQL fail: ${mysqlMessage}` } };
  return Object.assign(new Error('Failed query: insert into `t` (`id`) values (?)'), { cause: driver });
}

describe('errors wrapped by drizzle (cause chain, errno in details.message)', () => {
  it('detects each error kind through the cause chain', () => {
    const dup = drizzleWrapped("Error 1062 (23000): Duplicate entry '?' for key 'memories.uq_invitation_author'");
    expect(isDuplicateKey(dup)).toBe(true);
    expect(isTxConflict(dup)).toBe(false);
    expect(isForeignKeyViolation(dup)).toBe(false);

    const conflict = drizzleWrapped('Error 9007 (HY000): Write conflict, txnStartTS=1');
    expect(isTxConflict(conflict)).toBe(true);
    expect(isDuplicateKey(conflict)).toBe(false);

    expect(isTxConflict(drizzleWrapped('Error 1213 (40001): deadlock'))).toBe(true);

    const fk = drizzleWrapped('Error 1452 (23000): Cannot add or update a child row');
    expect(isForeignKeyViolation(fk)).toBe(true);
    expect(isDuplicateKey(fk)).toBe(false);
  });

  it('extracts the errno from details.message alone, without message text matches', () => {
    expect(isDuplicateKey({ details: { code: 61100002, message: 'Error 1062 (23000): x' } })).toBe(true);
    expect(isForeignKeyViolation({ details: { code: 61100002, message: 'Error 1452 (23000): x' } })).toBe(true);
  });

  it('does not treat the TiDB Cloud API code as an errno, and rejects other errnos', () => {
    const other = drizzleWrapped('Error 1146 (42S02): Table does not exist');
    expect(isDuplicateKey(other)).toBe(false);
    expect(isTxConflict(other)).toBe(false);
    expect(isForeignKeyViolation(other)).toBe(false);
    expect(isDuplicateKey({ details: { code: 61100002 } })).toBe(false);
  });

  it('survives cause cycles and stops at a bounded depth', () => {
    const a: { cause?: unknown; message: string } = { message: 'a' };
    const b = { cause: a, message: 'b' };
    a.cause = b;
    expect(isDuplicateKey(a)).toBe(false);

    let deep: unknown = { message: 'Error 1062 (23000): dup' };
    for (let i = 0; i < 10; i++) deep = { message: 'wrapper', cause: deep };
    expect(isDuplicateKey(deep)).toBe(false);
  });
});

describe('user text inside the drizzle query wrapper is ignored', () => {
  const hostile = [
    'Error 9007 (ha)',
    'a deadlock found',
    'Error 1452 (x',
    'Duplicate entry',
    'write conflict',
    'foreign key constraint fails',
  ];

  it.each(hostile)('does not classify a real DrizzleQueryError with params %j', async (text) => {
    const { DrizzleQueryError } = await import('drizzle-orm/errors');
    const err = new DrizzleQueryError('insert into `memories` (`note`) values (?)', [text], new TypeError('fetch failed'));
    expect(err.message).toContain(text);
    expect(isTxConflict(err)).toBe(false);
    expect(isForeignKeyViolation(err)).toBe(false);
    expect(isDuplicateKey(err)).toBe(false);
  });

  it('still classifies a real DrizzleQueryError wrapping a driver error', async () => {
    const { DrizzleQueryError } = await import('drizzle-orm/errors');
    const driver = (msg: string) =>
      Object.assign(new Error('fail'), { status: 400, details: { code: 61100002, message: `Execute SQL fail: ${msg}` } });
    const wrap = (msg: string) => new DrizzleQueryError('insert ...', ['Error 1452 (x'], driver(msg));
    expect(isDuplicateKey(wrap("Error 1062 (23000): Duplicate entry '?' for key 'k'"))).toBe(true);
    expect(isTxConflict(wrap('Error 9007 (HY000): Write conflict'))).toBe(true);
    expect(isForeignKeyViolation(wrap('Error 1452 (23000): Cannot add'))).toBe(true);
    // parametrii ostili nu produc fals pozitiv chiar si cand cauza reala e alta eroare
    expect(isForeignKeyViolation(wrap('Error 1062 (23000): Duplicate entry'))).toBe(false);
  });

  it('only reads an errno at the start of a driver-level message', () => {
    expect(isTxConflict({ message: 'note mentions Error 9007 (x) in passing' })).toBe(false);
  });
});

describe('dbErrorCode / dbErrorKind', () => {
  it('reads the errno from the driver message through the drizzle wrapper', () => {
    const err = drizzleWrapped("Error 1062 (23000): Duplicate entry 'x' for key 'k'");
    expect(dbErrorCode(err)).toBe('1062');
    expect(dbErrorKind(err)).toBe('duplicate');
  });

  it('reads an explicit code (string or number) but ignores the 8-digit TiDB Cloud API code', () => {
    expect(dbErrorCode({ code: 1045 })).toBe('1045');
    expect(dbErrorCode({ details: { code: '9007' } })).toBe('9007');
    expect(dbErrorCode({ details: { code: 61100002 } })).toBeNull();
    expect(dbErrorCode({ code: 'ECONNREFUSED' })).toBeNull();
  });

  it.each([
    ['Error 1045 (28000): Access denied', 'access_denied'],
    ['Error 1049 (42000): Unknown database', 'unknown_database'],
    ['Error 1146 (42S02): Table missing', 'table_missing'],
    ['Error 1062 (23000): Duplicate entry', 'duplicate'],
    ['Error 9007 (HY000): Write conflict', 'conflict'],
    ['Error 1213 (40001): deadlock', 'conflict'],
    ['Error 1452 (23000): Cannot add', 'fk'],
    ['Error 1064 (42000): syntax', 'db_error'],
  ])('maps %j to %s', (message, kind) => {
    expect(dbErrorKind(drizzleWrapped(message))).toBe(kind);
  });

  it('is null without an errno and never reads text inside the drizzle wrapper', async () => {
    expect(dbErrorCode(new Error('boom'))).toBeNull();
    expect(dbErrorKind(new TypeError('fetch failed'))).toBeNull();
    expect(dbErrorKind(null)).toBeNull();
    expect(dbErrorKind('nope')).toBeNull();
    const { DrizzleQueryError } = await import('drizzle-orm/errors');
    const hostile = new DrizzleQueryError('insert ...', ['Error 1045 (x'], new TypeError('fetch failed'));
    expect(dbErrorCode(hostile)).toBeNull();
    expect(dbErrorKind(hostile)).toBeNull();
  });
});
