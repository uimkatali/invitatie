import { describe, it, expect } from 'vitest';
import { resolveThemeId, DEFAULT_THEME_ID } from './edge-config';

describe('resolveThemeId', () => {
  it('returns the value when it is a non-empty string', () => {
    expect(resolveThemeId('licurici-de-vara')).toBe('licurici-de-vara');
  });

  it('falls back to the default for undefined', () => {
    expect(resolveThemeId(undefined)).toBe(DEFAULT_THEME_ID);
  });

  it('falls back to the default for an empty string', () => {
    expect(resolveThemeId('')).toBe(DEFAULT_THEME_ID);
  });

  it('falls back to the default for a non-string value', () => {
    expect(resolveThemeId(42)).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID);
  });
});
