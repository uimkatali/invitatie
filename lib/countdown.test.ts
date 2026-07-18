import { describe, it, expect } from 'vitest';
import { getTimeRemaining, pad2 } from './countdown';

describe('pad2', () => {
  it('pads single digits with a leading zero', () => {
    expect(pad2(5)).toBe('05');
  });

  it('leaves two-digit numbers unchanged', () => {
    expect(pad2(42)).toBe('42');
  });
});

describe('getTimeRemaining', () => {
  it('breaks down a future date into days/hours/minutes/seconds', () => {
    const now = new Date('2026-07-23T10:00:00+03:00');
    const target = '2026-07-25T13:05:06+03:00';
    const result = getTimeRemaining(target, now);
    expect(result).toEqual({ days: 2, hours: 3, minutes: 5, seconds: 6, isComplete: false });
  });

  it('marks isComplete true when the target is in the past', () => {
    const now = new Date('2026-07-26T00:00:00+03:00');
    const target = '2026-07-25T13:00:00+03:00';
    const result = getTimeRemaining(target, now);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true });
  });

  it('marks isComplete true exactly at the target time', () => {
    const now = new Date('2026-07-25T13:00:00+03:00');
    const target = '2026-07-25T13:00:00+03:00';
    const result = getTimeRemaining(target, now);
    expect(result.isComplete).toBe(true);
  });
});
