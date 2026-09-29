import { describe, it, expect } from 'vitest';
import { canHaveMemories } from './service';

const NOW = new Date('2026-09-28T12:00:00Z');

describe('canHaveMemories', () => {
  it('only for accepted dates that already started', () => {
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(true);
    expect(canHaveMemories({ status: 'accepted', startsAt: new Date('2026-10-20T17:00:00Z') }, NOW)).toBe(false);
    expect(canHaveMemories({ status: 'declined', startsAt: new Date('2026-09-20T17:00:00Z') }, NOW)).toBe(false);
  });
});
