import { describe, it, expect } from 'vitest';
import { affectedRows } from './client';

describe('affectedRows', () => {
  it('reads rowsAffected from a TiDB FullResult-shaped object', () => {
    expect(affectedRows({ types: null, rows: null, statement: 'update ...', rowCount: null, rowsAffected: 1, lastInsertId: null })).toBe(1);
    expect(affectedRows({ rowsAffected: 0 })).toBe(0);
  });

  it('treats a null rowsAffected as 0', () => {
    expect(affectedRows({ rowsAffected: null })).toBe(0);
  });

  it('falls back to a mysql2-style affectedRows field', () => {
    expect(affectedRows({ affectedRows: 2 })).toBe(2);
  });

  it('returns 0 for shapes it does not recognize', () => {
    expect(affectedRows(undefined)).toBe(0);
    expect(affectedRows(null)).toBe(0);
    expect(affectedRows({})).toBe(0);
    expect(affectedRows([])).toBe(0);
    expect(affectedRows('not an object')).toBe(0);
  });
});
