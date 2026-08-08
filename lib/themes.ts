// lib/themes.ts — temporary minimal stub, Task 7 replaces this with the real 15-theme system
export interface ThemeColors {
  bgDark: string;
  bgMid: string;
  accentPrimary: string;
  accentSecondary: string;
  cream: string;
}

export function getThemeForId(id: string, overrides: Record<string, string> | null) {
  const defaults: ThemeColors = {
    bgDark: '#2a1f3d', bgMid: '#5b4a7a', accentPrimary: '#7fc4e8', accentSecondary: '#ffb6c9', cream: '#fdf0e0',
  };
  return {
    colors: overrides ? ({ ...defaults, ...overrides } as ThemeColors) : defaults,
  };
}
