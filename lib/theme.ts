export interface ThemeColors {
  bgDark: string;
  bgMid: string;
  accentPrimary: string;
  accentSecondary: string;
  cream: string;
}

export interface Theme {
  monthIndex: number;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    monthIndex: 1,
    name: 'Iarna de cristal',
    colors: { bgDark: '#131c2e', bgMid: '#24344f', accentPrimary: '#9fd8ff', accentSecondary: '#d8e8ff', cream: '#f4f8ff' },
  },
  {
    monthIndex: 2,
    name: 'Rosu de Valentine',
    colors: { bgDark: '#2b0f16', bgMid: '#4a1a26', accentPrimary: '#ff6b81', accentSecondary: '#ffd166', cream: '#fff0e6' },
  },
  {
    monthIndex: 3,
    name: 'Verde de primavara',
    colors: { bgDark: '#10261c', bgMid: '#1c3d2c', accentPrimary: '#7ed6a5', accentSecondary: '#f4e285', cream: '#f2fbe8' },
  },
  {
    monthIndex: 4,
    name: 'Lavanda',
    colors: { bgDark: '#241b34', bgMid: '#3d2c58', accentPrimary: '#b39ddb', accentSecondary: '#f7c6d9', cream: '#f7f2fb' },
  },
  {
    monthIndex: 5,
    name: 'Corai floral',
    colors: { bgDark: '#2e1620', bgMid: '#4d2436', accentPrimary: '#ff9a8b', accentSecondary: '#ffd6a5', cream: '#fff3e8' },
  },
  {
    monthIndex: 6,
    name: 'Turcoaz de vara',
    colors: { bgDark: '#0d2b2e', bgMid: '#164a4d', accentPrimary: '#4fd1c5', accentSecondary: '#f6e7b2', cream: '#eafffb' },
  },
  {
    monthIndex: 7,
    name: 'Pastel visator',
    colors: { bgDark: '#2a1f3d', bgMid: '#5b4a7a', accentPrimary: '#7fc4e8', accentSecondary: '#ffb6c9', cream: '#fdf0e0' },
  },
  {
    monthIndex: 8,
    name: 'Auriu de nisip',
    colors: { bgDark: '#2c210f', bgMid: '#4d3a1c', accentPrimary: '#e8b84b', accentSecondary: '#f2a65a', cream: '#fff6e0' },
  },
  {
    monthIndex: 9,
    name: 'Rugin de toamna',
    colors: { bgDark: '#2a160f', bgMid: '#4a2a1c', accentPrimary: '#d97b4f', accentSecondary: '#f2c14e', cream: '#fff2e6' },
  },
  {
    monthIndex: 10,
    name: 'Mov mistic',
    colors: { bgDark: '#1a0f24', bgMid: '#331d47', accentPrimary: '#a259d9', accentSecondary: '#ff9f5a', cream: '#f6ecff' },
  },
  {
    monthIndex: 11,
    name: 'Gri cald',
    colors: { bgDark: '#201c1c', bgMid: '#3a3232', accentPrimary: '#c9a9a6', accentSecondary: '#8f6a5c', cream: '#f5ece8' },
  },
  {
    monthIndex: 12,
    name: 'Rosu si argint',
    colors: { bgDark: '#1a1420', bgMid: '#33101a', accentPrimary: '#e63950', accentSecondary: '#c0c8d8', cream: '#fff5f5' },
  },
];

export function getThemeForMonth(monthIndex: number): Theme {
  const theme = THEMES.find((t) => t.monthIndex === monthIndex);
  if (!theme) {
    throw new Error(`No theme configured for month ${monthIndex}. Expected 1-12.`);
  }
  return theme;
}
