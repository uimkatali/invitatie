import { describe, it, expect } from 'vitest';
import { isValidZone, MEDIA_ZONES } from './media';

describe('isValidZone', () => {
  it('accepts each of the three defined zones', () => {
    for (const zone of MEDIA_ZONES) {
      expect(isValidZone(zone)).toBe(true);
    }
  });

  it('rejects an unknown zone', () => {
    expect(isValidZone('notAZone')).toBe(false);
  });
});
