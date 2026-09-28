import { describe, it, expect } from 'vitest';
import { formatDisplayName } from './display-names';

describe('formatDisplayName', () => {
  it('capitalizes the first letter', () => {
    expect(formatDisplayName('catalin')).toBe('Catalin');
    expect(formatDisplayName('  ana ')).toBe('Ana');
  });
});
