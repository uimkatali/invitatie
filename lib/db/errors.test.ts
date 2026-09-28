import { describe, it, expect } from 'vitest';
import { isTxConflict } from './errors';

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
