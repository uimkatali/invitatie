import { describe, it, expect } from 'vitest';
import { getThemeForMonth, THEMES } from './theme';

describe('THEMES', () => {
  it('has exactly 12 entries, one per month, all distinct', () => {
    expect(THEMES).toHaveLength(12);
    const months = THEMES.map((t) => t.monthIndex).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const names = new Set(THEMES.map((t) => t.name));
    expect(names.size).toBe(12);
  });
});

describe('getThemeForMonth', () => {
  it('returns the July theme with the approved pastel palette', () => {
    const theme = getThemeForMonth(7);
    expect(theme.monthIndex).toBe(7);
    expect(theme.colors).toEqual({
      bgDark: '#2a1f3d',
      bgMid: '#5b4a7a',
      accentPrimary: '#7fc4e8',
      accentSecondary: '#ffb6c9',
      cream: '#fdf0e0',
    });
  });

  it('returns a different theme for a different month', () => {
    const july = getThemeForMonth(7);
    const december = getThemeForMonth(12);
    expect(july.colors).not.toEqual(december.colors);
  });

  it('throws for an out-of-range month', () => {
    expect(() => getThemeForMonth(0)).toThrow();
    expect(() => getThemeForMonth(13)).toThrow();
  });
});
