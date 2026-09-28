import { describe, it, expect } from 'vitest';
import { isBlocked, afterFailure, hashIp, RATE_LIMIT_MAX_FAILURES, RATE_LIMIT_WINDOW_MS } from './rate-limit';

const NOW = new Date('2026-09-28T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe('isBlocked', () => {
  it('is false without a row', () => {
    expect(isBlocked(null, NOW)).toBe(false);
  });

  it('is true at the max inside the window', () => {
    expect(isBlocked({ windowStart: minutesAgo(5), count: RATE_LIMIT_MAX_FAILURES }, NOW)).toBe(true);
  });

  it('is false below the max', () => {
    expect(isBlocked({ windowStart: minutesAgo(5), count: RATE_LIMIT_MAX_FAILURES - 1 }, NOW)).toBe(false);
  });

  it('is false once the window passed', () => {
    const windowMinutes = RATE_LIMIT_WINDOW_MS / 60_000;
    expect(isBlocked({ windowStart: minutesAgo(windowMinutes), count: 99 }, NOW)).toBe(false);
  });
});

describe('afterFailure', () => {
  it('starts a new window', () => {
    expect(afterFailure(null, NOW)).toEqual({ windowStart: NOW, count: 1 });
  });

  it('increments inside the window', () => {
    const start = minutesAgo(3);
    expect(afterFailure({ windowStart: start, count: 2 }, NOW)).toEqual({ windowStart: start, count: 3 });
  });

  it('resets after the window', () => {
    expect(afterFailure({ windowStart: minutesAgo(16), count: 5 }, NOW)).toEqual({ windowStart: NOW, count: 1 });
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
