import { describe, it, expect } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { EnvError } from './env';
import { errorInfo, errorName } from './log';

describe('errorInfo', () => {
  it('gives only the name for an unknown error, never its message', () => {
    const info = errorInfo(new TypeError('cannot read secret-token-123 of undefined'));
    expect(info).toEqual({ reason: 'TypeError' });
    expect(JSON.stringify(info)).not.toContain('secret-token-123');
  });

  it('gives a generic reason for non-errors', () => {
    expect(errorInfo('boom')).toEqual({ reason: 'UnknownError' });
    expect(errorInfo(null)).toEqual({ reason: 'UnknownError' });
    expect(errorName(undefined)).toBe('UnknownError');
  });

  it('includes the message of an EnvError (variable names only)', () => {
    const err = new EnvError('Variabile de mediu lipsa sau invalide: SESSION_SECRET (Too small)');
    expect(errorInfo(err)).toEqual({
      reason: 'EnvError',
      detail: 'Variabile de mediu lipsa sau invalide: SESSION_SECRET (Too small)',
    });
  });

  it('adds dbCode and dbKind when a MySQL errno is found in the cause chain', () => {
    const driver = Object.assign(new Error('fail'), {
      status: 400,
      details: { code: 61100002, message: "Execute SQL fail: Error 1045 (28000): Access denied for user 'x'" },
    });
    const err = new DrizzleQueryError('select 1', [], driver);
    expect(errorInfo(err)).toEqual({ reason: 'Error', dbCode: '1045', dbKind: 'access_denied' });
  });

  it('never leaks hostile user text from the drizzle wrapper params or message', () => {
    const hostile = 'my-private-note Error 1062 (x <script>';
    const err = new DrizzleQueryError('insert into `memories` (`note`) values (?)', [hostile], new TypeError('fetch failed'));
    const info = errorInfo(err);
    const text = JSON.stringify(info);
    expect(text).not.toContain('my-private-note');
    expect(text).not.toContain('Failed query');
    expect(text).not.toContain('insert into');
    expect(info).toEqual({ reason: 'Error' });
  });

  it('does not put a DB error message into detail', () => {
    const driver = Object.assign(new Error('boom'), { details: { message: "Error 1062 (23000): Duplicate entry 'private@x' for key 'k'" } });
    const info = errorInfo(driver);
    expect(info).toEqual({ reason: 'Error', dbCode: '1062', dbKind: 'duplicate' });
    expect(JSON.stringify(info)).not.toContain('private@x');
  });
});
