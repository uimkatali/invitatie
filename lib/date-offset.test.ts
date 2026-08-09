import { describe, it, expect } from 'vitest';
import { parseIso, toIsoWithOffset } from './date-offset';

describe('parseIso / toIsoWithOffset', () => {
  it('round-trips a +03:00-offset ISO string', () => {
    const iso = '2026-07-25T13:00:00+03:00';
    const { localValue, offset } = parseIso(iso);
    expect(localValue).toBe('2026-07-25T13:00');
    expect(offset).toBe('+03:00');
    expect(toIsoWithOffset(localValue, offset)).toBe(iso);
  });

  it('round-trips a Z-suffixed UTC ISO string', () => {
    const iso = '2026-07-25T13:00:00Z';
    const { localValue, offset } = parseIso(iso);
    expect(localValue).toBe('2026-07-25T13:00');
    expect(offset).toBe('Z');
    expect(toIsoWithOffset(localValue, offset)).toBe(iso);
  });

  it('preserves the date/time portion exactly, with no off-by-one from timezone reinterpretation', () => {
    // A time close to midnight is the case most likely to shift a day if the
    // string were ever parsed through Date() and reformatted in local time.
    const iso = '2026-01-01T00:15:00+05:00';
    const { localValue, offset } = parseIso(iso);
    expect(localValue).toBe('2026-01-01T00:15');
    expect(offset).toBe('+05:00');
    expect(toIsoWithOffset(localValue, offset)).toBe(iso);
  });

  it('falls back to an empty local value and +00:00 offset for an unparseable string', () => {
    const { localValue, offset } = parseIso('not-a-date');
    expect(localValue).toBe('');
    expect(offset).toBe('+00:00');
  });
});
