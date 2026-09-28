import { describe, it, expect } from 'vitest';
import { newId, isUuid } from './ids';

describe('ids', () => {
  it('generates valid uuids', () => {
    const id = newId();
    expect(isUuid(id)).toBe(true);
    expect(newId()).not.toBe(id);
  });

  it('rejects non-uuids', () => {
    expect(isUuid('123')).toBe(false);
    expect(isUuid("1' OR '1'='1")).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});
