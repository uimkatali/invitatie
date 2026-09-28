import { describe, it, expect } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { hashIp, exceedsLimit, toSqlDateTime, buildReserveAttemptQuery, RATE_LIMIT_MAX_FAILURES } from './rate-limit';

describe('exceedsLimit', () => {
  it('is false at and below the max', () => {
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES)).toBe(false);
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES - 1)).toBe(false);
  });

  it('is true above the max', () => {
    expect(exceedsLimit(RATE_LIMIT_MAX_FAILURES + 1)).toBe(true);
  });
});

describe('toSqlDateTime', () => {
  it('formats a UTC date as YYYY-MM-DD HH:MM:SS', () => {
    expect(toSqlDateTime(new Date('2026-09-28T12:34:56.789Z'))).toBe('2026-09-28 12:34:56');
  });
});

describe('hashIp', () => {
  it('is stable, hex, and depends on the secret', () => {
    const a = hashIp('1.2.3.4', 'x'.repeat(32));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('1.2.3.4', 'x'.repeat(32))).toBe(a);
    expect(hashIp('1.2.3.4', 'y'.repeat(32))).not.toBe(a);
  });
});

describe('buildReserveAttemptQuery', () => {
  it('assigns count before window_start in the SET clause', () => {
    // MySQL/TiDB evaluate ON DUPLICATE KEY UPDATE assignments left to right, and the
    // count expression reads window_start: if window_start were reassigned first,
    // count would see the new value instead of the value stored before this statement.
    const now = new Date('2026-09-28T12:00:00Z');
    const dialect = new MySqlDialect();

    const { sql: text } = dialect.sqlToQuery(buildReserveAttemptQuery('x'.repeat(64), now));

    const countIdx = text.indexOf('`count` =');
    const windowIdx = text.indexOf('`window_start` =');
    expect(countIdx).toBeGreaterThan(-1);
    expect(windowIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeLessThan(windowIdx);
  });

  it('does not qualify the SET target columns with the table name', () => {
    const now = new Date('2026-09-28T12:00:00Z');
    const dialect = new MySqlDialect();
    const { sql: text } = dialect.sqlToQuery(buildReserveAttemptQuery('x'.repeat(64), now));

    expect(text).toContain('on duplicate key update');
    expect(text).not.toContain('login_attempts`.`count` =');
    expect(text).not.toContain('login_attempts`.`window_start` =');
  });
});
