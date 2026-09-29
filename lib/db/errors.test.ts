import { describe, it, expect } from 'vitest';
import { isForeignKeyViolation, isTxConflict, isDuplicateKey } from './errors';

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
