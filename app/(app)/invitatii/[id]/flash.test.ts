import { describe, it, expect } from 'vitest';
import { FLASH_MESSAGES, flashMessage } from './flash';

describe('flashMessage', () => {
  it('maps each known key to its fixed message', () => {
    for (const [key, message] of Object.entries(FLASH_MESSAGES)) {
      expect(flashMessage(key)).toBe(message);
    }
  });

  it('returns null for unknown or missing keys', () => {
    expect(flashMessage('nu-exista')).toBeNull();
    expect(flashMessage('')).toBeNull();
    expect(flashMessage(undefined)).toBeNull();
  });

  it('never reflects the raw param or inherited object properties', () => {
    expect(flashMessage('<script>alert(1)</script>')).toBeNull();
    expect(flashMessage('constructor')).toBeNull();
    expect(flashMessage('__proto__')).toBeNull();
    expect(flashMessage('toString')).toBeNull();
  });

  it('ignores repeated params (array form)', () => {
    expect(flashMessage(['raspuns', 'anulata'])).toBeNull();
  });
});
