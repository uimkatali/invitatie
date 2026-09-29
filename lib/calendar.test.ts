import { describe, it, expect } from 'vitest';
import { parseMonthParam, shiftMonth, formatMonthParam, monthGrid, gridRangeUtc, monthLabelRo, isMonthInRange } from './calendar';

const NOW = new Date('2026-09-28T12:00:00Z');

describe('parseMonthParam', () => {
  it('parses YYYY-MM', () => {
    expect(parseMonthParam('2026-02', NOW)).toEqual({ year: 2026, month: 2 });
  });

  it('falls back to the current Bucharest month', () => {
    expect(parseMonthParam(undefined, NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('2026-13', NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('<script>', NOW)).toEqual({ year: 2026, month: 9 });
    expect(parseMonthParam('1999-01', NOW)).toEqual({ year: 2026, month: 9 });
  });
});

describe('shiftMonth / formatMonthParam', () => {
  it('wraps years', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('monthGrid', () => {
  it('builds Monday-first weeks covering the month (September 2026)', () => {
    const weeks = monthGrid({ year: 2026, month: 9 });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ key: '2026-08-31', day: 31, inMonth: false });
    expect(weeks[0][1]).toEqual({ key: '2026-09-01', day: 1, inMonth: true });
    expect(weeks[4][6]).toEqual({ key: '2026-10-04', day: 4, inMonth: false });
  });

  it('handles a month starting on Sunday (February 2026)', () => {
    const weeks = monthGrid({ year: 2026, month: 2 });
    expect(weeks[0][6]).toEqual({ key: '2026-02-01', day: 1, inMonth: true });
  });
});

describe('gridRangeUtc', () => {
  it('spans from the first grid day to the day after the last, in Bucharest time', () => {
    const range = gridRangeUtc(monthGrid({ year: 2026, month: 9 }));
    expect(range.from.toISOString()).toBe('2026-08-30T21:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-10-04T21:00:00.000Z');
  });
});

describe('monthLabelRo', () => {
  it('names the month in Romanian', () => {
    expect(monthLabelRo({ year: 2026, month: 9 })).toBe('septembrie 2026');
  });
});

describe('isMonthInRange', () => {
  it('accepts 2020-01 through 2100-12 only', () => {
    expect(isMonthInRange({ year: 2020, month: 1 })).toBe(true);
    expect(isMonthInRange({ year: 2100, month: 12 })).toBe(true);
    expect(isMonthInRange({ year: 2019, month: 12 })).toBe(false);
    expect(isMonthInRange({ year: 2101, month: 1 })).toBe(false);
  });
});
