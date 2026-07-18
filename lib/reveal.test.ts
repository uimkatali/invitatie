import { describe, it, expect } from 'vitest';
import { nextStepIndex } from './reveal';

describe('nextStepIndex', () => {
  it('advances to the next index when more steps remain', () => {
    expect(nextStepIndex(0, 4)).toBe(1);
    expect(nextStepIndex(2, 4)).toBe(3);
  });

  it('returns -1 when the current index is the last step', () => {
    expect(nextStepIndex(3, 4)).toBe(-1);
  });

  it('returns -1 when there is only one step', () => {
    expect(nextStepIndex(0, 1)).toBe(-1);
  });

  it('returns -1 when total is zero', () => {
    expect(nextStepIndex(0, 0)).toBe(-1);
  });
});
