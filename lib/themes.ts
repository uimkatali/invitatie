export type ParticleShape = 'alienCreature' | 'crystal' | 'ribbon' | 'ring' | 'blob' | 'heart' | 'star';
export type MotionPattern = 'driftParallax' | 'orbit' | 'fall' | 'swirl';
export type MaterialKind = 'glass' | 'iridescent';

export interface ThemeColors {
  bgDark: string;
  bgMid: string;
  accentPrimary: string;
  accentSecondary: string;
  cream: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  particleShape: ParticleShape;
  motionPattern: MotionPattern;
  material: MaterialKind;
  postProcessing: { bloom: boolean; vignette: boolean };
  count: number;
  starfield: boolean;
  colors: ThemeColors;
}

export const THEME_CONFIGS: ThemeConfig[] = [
  { id: 'alien-field', name: 'Camp de alieni', particleShape: 'alienCreature', motionPattern: 'driftParallax', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 18, starfield: true, colors: { bgDark: '#2a1f3d', bgMid: '#5b4a7a', accentPrimary: '#7fc4e8', accentSecondary: '#ffb6c9', cream: '#fdf0e0' } },
  { id: 'crystal-field', name: 'Cristale plutitoare', particleShape: 'crystal', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 24, starfield: true, colors: { bgDark: '#0d1420', bgMid: '#1b2a3f', accentPrimary: '#9fd8ff', accentSecondary: '#d8e8ff', cream: '#f4f8ff' } },
  { id: 'light-ribbons', name: 'Panglici de lumina', particleShape: 'ribbon', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: true, vignette: false }, count: 14, starfield: false, colors: { bgDark: '#1a0f24', bgMid: '#331d47', accentPrimary: '#a259d9', accentSecondary: '#ff9f5a', cream: '#f6ecff' } },
  { id: 'orbital-rings', name: 'Inele orbitale', particleShape: 'ring', motionPattern: 'orbit', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 12, starfield: true, colors: { bgDark: '#0d2b2e', bgMid: '#164a4d', accentPrimary: '#4fd1c5', accentSecondary: '#f6e7b2', cream: '#eafffb' } },
  { id: 'cosmic-swirl', name: 'Vartej cosmic', particleShape: 'blob', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 20, starfield: true, colors: { bgDark: '#131c2e', bgMid: '#24344f', accentPrimary: '#9fd8ff', accentSecondary: '#c9a9ff', cream: '#f4f8ff' } },
  { id: 'glass-snow', name: 'Ninsoare de sticla', particleShape: 'crystal', motionPattern: 'fall', material: 'glass', postProcessing: { bloom: false, vignette: true }, count: 40, starfield: false, colors: { bgDark: '#0a0f18', bgMid: '#1a2436', accentPrimary: '#e8f4ff', accentSecondary: '#a8c8e8', cream: '#ffffff' } },
  { id: 'valentine-hearts', name: 'Rosu de Valentine', particleShape: 'heart', motionPattern: 'driftParallax', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 22, starfield: false, colors: { bgDark: '#2b0f16', bgMid: '#4a1a26', accentPrimary: '#ff6b81', accentSecondary: '#ffd166', cream: '#fff0e6' } },
  { id: 'spring-blobs', name: 'Verde de primavara', particleShape: 'blob', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: false, vignette: false }, count: 16, starfield: false, colors: { bgDark: '#10261c', bgMid: '#1c3d2c', accentPrimary: '#7ed6a5', accentSecondary: '#f4e285', cream: '#f2fbe8' } },
  { id: 'lavender-rings', name: 'Lavanda', particleShape: 'ring', motionPattern: 'orbit', material: 'iridescent', postProcessing: { bloom: true, vignette: false }, count: 10, starfield: false, colors: { bgDark: '#241b34', bgMid: '#3d2c58', accentPrimary: '#b39ddb', accentSecondary: '#f7c6d9', cream: '#f7f2fb' } },
  { id: 'coral-stars', name: 'Corai floral', particleShape: 'star', motionPattern: 'fall', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 26, starfield: false, colors: { bgDark: '#2e1620', bgMid: '#4d2436', accentPrimary: '#ff9a8b', accentSecondary: '#ffd6a5', cream: '#fff3e8' } },
  { id: 'summer-teal', name: 'Turcoaz de vara', particleShape: 'blob', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: false, vignette: false }, count: 18, starfield: false, colors: { bgDark: '#0d2b2e', bgMid: '#164a4d', accentPrimary: '#4fd1c5', accentSecondary: '#f6e7b2', cream: '#eafffb' } },
  { id: 'golden-sand', name: 'Auriu de nisip', particleShape: 'crystal', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 20, starfield: false, colors: { bgDark: '#2c210f', bgMid: '#4d3a1c', accentPrimary: '#e8b84b', accentSecondary: '#f2a65a', cream: '#fff6e0' } },
  { id: 'autumn-rust', name: 'Rugin de toamna', particleShape: 'star', motionPattern: 'fall', material: 'iridescent', postProcessing: { bloom: false, vignette: true }, count: 24, starfield: false, colors: { bgDark: '#2a160f', bgMid: '#4a2a1c', accentPrimary: '#d97b4f', accentSecondary: '#f2c14e', cream: '#fff2e6' } },
  { id: 'warm-grey', name: 'Gri cald', particleShape: 'ring', motionPattern: 'orbit', material: 'glass', postProcessing: { bloom: false, vignette: false }, count: 8, starfield: false, colors: { bgDark: '#201c1c', bgMid: '#3a3232', accentPrimary: '#c9a9a6', accentSecondary: '#8f6a5c', cream: '#f5ece8' } },
  { id: 'festive-red', name: 'Rosu si argint', particleShape: 'ribbon', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 16, starfield: true, colors: { bgDark: '#1a1420', bgMid: '#33101a', accentPrimary: '#e63950', accentSecondary: '#c0c8d8', cream: '#fff5f5' } },
];

export interface ResolvedTheme extends ThemeConfig {}

export function getThemeForId(id: string, colorOverrides: Record<string, string> | null): ResolvedTheme {
  const base = THEME_CONFIGS.find((t) => t.id === id) ?? THEME_CONFIGS[0];
  return {
    ...base,
    colors: { ...base.colors, ...(colorOverrides ?? {}) },
  };
}
