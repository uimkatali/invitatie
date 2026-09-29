import { describe, it, expect } from 'vitest';
import { parseLocalDateTime, toLocalInputValue, localDateKey, formatDateTimeRo, formatShortRo } from './time';

describe('parseLocalDateTime', () => {
  it('converts summer time (UTC+3)', () => {
    expect(parseLocalDateTime('2026-07-25T20:00')?.toISOString()).toBe('2026-07-25T17:00:00.000Z');
  });

  it('converts winter time (UTC+2)', () => {
    expect(parseLocalDateTime('2026-01-10T20:00')?.toISOString()).toBe('2026-01-10T18:00:00.000Z');
  });

  it('handles the DST gap without failing', () => {
    // 2026-03-29 03:30 nu exista in Romania (ceasul sare de la 03:00 la 04:00)
    expect(parseLocalDateTime('2026-03-29T03:30')?.toISOString()).toBe('2026-03-29T01:30:00.000Z');
  });

  it('resolves the DST overlap to the earlier instant', () => {
    // 2026-10-25 03:30 exista de doua ori (ceasul revine de la 04:00 la 03:00); alegem prima aparitie.
    expect(parseLocalDateTime('2026-10-25T03:30')?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('rejects malformed or impossible values', () => {
    expect(parseLocalDateTime('abc')).toBeNull();
    expect(parseLocalDateTime('2026-02-30T10:00')).toBeNull();
    expect(parseLocalDateTime('2026-13-01T10:00')).toBeNull();
    expect(parseLocalDateTime('2026-01-01T24:00')).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  });
});

describe('toLocalInputValue', () => {
  it('round-trips with parseLocalDateTime', () => {
    const date = new Date('2026-07-25T17:00:00.000Z');
    expect(toLocalInputValue(date)).toBe('2026-07-25T20:00');
    expect(parseLocalDateTime(toLocalInputValue(date))?.getTime()).toBe(date.getTime());
  });
});

describe('localDateKey', () => {
  it('uses the Bucharest calendar day', () => {
    // 22:30 UTC = 01:30 a doua zi in Bucuresti (vara)
    expect(localDateKey(new Date('2026-07-25T22:30:00Z'))).toBe('2026-07-26');
  });
});

describe('formatDateTimeRo', () => {
  it('formats in Romanian with Bucharest time', () => {
    const text = formatDateTimeRo(new Date('2026-07-25T17:00:00Z'));
    expect(text).toContain('iulie');
    expect(text).toContain('20:00');
  });

  it('strips diacritics like the rest of the UI copy', () => {
    // 2026-09-26 este sambata (in ro-RO: "sâmbătă"); 2026-03-15 este duminica, luna martie.
    const saturday = formatDateTimeRo(new Date('2026-09-26T17:00:00Z'));
    expect(saturday.toLowerCase()).toContain('sambata');
    expect(saturday).toMatch(/^[ -~]+$/);
    expect(formatDateTimeRo(new Date('2026-02-11T10:00:00Z'))).toMatch(/^[ -~]+$/);
  });
});

describe('formatShortRo', () => {
  it('formats day, short month and time without diacritics', () => {
    const text = formatShortRo(new Date('2026-09-26T17:00:00Z'));
    expect(text).toContain('20:00');
    expect(text).toMatch(/^[ -~]+$/);
  });
});
