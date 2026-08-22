export type ParticleShape =
  | 'alienCreature'
  | 'crystal'
  | 'ribbon'
  | 'ring'
  | 'blob'
  | 'heart'
  | 'star'
  | 'petal'
  | 'firefly';
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
  { id: 'petale-in-vant', name: 'Petale in vant', particleShape: 'petal', motionPattern: 'fall', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 22, starfield: false, colors: { bgDark: '#3d2233', bgMid: '#6b3a52', accentPrimary: '#ff9ab0', accentSecondary: '#ffd3a8', cream: '#fff2e6' } },
  { id: 'licurici-de-vara', name: 'Licurici de vara', particleShape: 'firefly', motionPattern: 'driftParallax', material: 'iridescent', postProcessing: { bloom: true, vignette: false }, count: 30, starfield: false, colors: { bgDark: '#1f2417', bgMid: '#39432a', accentPrimary: '#ffd873', accentSecondary: '#fff4c2', cream: '#fffbe8' } },
  { id: 'flori-de-cires', name: 'Flori de cires', particleShape: 'petal', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 20, starfield: true, colors: { bgDark: '#241c2e', bgMid: '#463554', accentPrimary: '#ffc4dd', accentSecondary: '#ffffff', cream: '#fff0f6' } },
  { id: 'constelatie-de-inimi', name: 'Constelatie de inimi', particleShape: 'heart', motionPattern: 'orbit', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 14, starfield: true, colors: { bgDark: '#1a1730', bgMid: '#332a54', accentPrimary: '#ff8fab', accentSecondary: '#f4c95d', cream: '#fdf3ff' } },
  { id: 'sarut-de-toamna', name: 'Sarut de toamna', particleShape: 'petal', motionPattern: 'fall', material: 'iridescent', postProcessing: { bloom: false, vignette: true }, count: 24, starfield: false, colors: { bgDark: '#2a160f', bgMid: '#4a2a1c', accentPrimary: '#e0864f', accentSecondary: '#f2c14e', cream: '#fff2e6' } },
  { id: 'vis-de-lavanda', name: 'Vis de lavanda', particleShape: 'blob', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: true, vignette: false }, count: 16, starfield: false, colors: { bgDark: '#241b34', bgMid: '#3d2c58', accentPrimary: '#c6a3e8', accentSecondary: '#ffc6e0', cream: '#f7f2fb' } },
  { id: 'noapte-de-vara', name: 'Noapte de vara', particleShape: 'firefly', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 26, starfield: true, colors: { bgDark: '#141833', bgMid: '#252c56', accentPrimary: '#ffd873', accentSecondary: '#ff9ab0', cream: '#fffbe8' } },
  { id: 'trandafiri-la-asfintit', name: 'Trandafiri la asfintit', particleShape: 'heart', motionPattern: 'driftParallax', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 18, starfield: false, colors: { bgDark: '#2e1620', bgMid: '#4d2436', accentPrimary: '#ff9a8b', accentSecondary: '#ffd6a5', cream: '#fff3e8' } },
  { id: 'ganduri-plutitoare', name: 'Ganduri plutitoare', particleShape: 'ribbon', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: false, vignette: false }, count: 14, starfield: false, colors: { bgDark: '#241f30', bgMid: '#413655', accentPrimary: '#d8c3ff', accentSecondary: '#fff2d8', cream: '#f8f4ff' } },
  { id: 'lumini-de-poveste', name: 'Lumini de poveste', particleShape: 'star', motionPattern: 'fall', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 20, starfield: true, colors: { bgDark: '#2c210f', bgMid: '#4d3a1c', accentPrimary: '#f4c95d', accentSecondary: '#fff2d8', cream: '#fff6e0' } },
  { id: 'inima-de-cristal', name: 'Inima de cristal', particleShape: 'crystal', motionPattern: 'orbit', material: 'glass', postProcessing: { bloom: true, vignette: false }, count: 12, starfield: false, colors: { bgDark: '#241c2e', bgMid: '#463554', accentPrimary: '#ffc4dd', accentSecondary: '#bfe3ff', cream: '#fff0f6' } },
  { id: 'petale-de-aur', name: 'Petale de aur', particleShape: 'petal', motionPattern: 'orbit', material: 'glass', postProcessing: { bloom: true, vignette: true }, count: 18, starfield: false, colors: { bgDark: '#2c210f', bgMid: '#4d3a1c', accentPrimary: '#e8b84b', accentSecondary: '#fff2d8', cream: '#fff6e0' } },
  { id: 'vals-de-toamna', name: 'Vals de toamna', particleShape: 'ring', motionPattern: 'swirl', material: 'iridescent', postProcessing: { bloom: false, vignette: true }, count: 10, starfield: false, colors: { bgDark: '#2a160f', bgMid: '#4a2a1c', accentPrimary: '#c05a4a', accentSecondary: '#f2c14e', cream: '#fff2e6' } },
  { id: 'prima-ninsoare', name: 'Prima ninsoare', particleShape: 'petal', motionPattern: 'fall', material: 'glass', postProcessing: { bloom: false, vignette: true }, count: 20, starfield: true, colors: { bgDark: '#0f1a24', bgMid: '#1e3346', accentPrimary: '#e8f4ff', accentSecondary: '#a8c8e8', cream: '#ffffff' } },
  { id: 'camp-de-alieni-clasic', name: 'Camp de alieni (clasic)', particleShape: 'alienCreature', motionPattern: 'driftParallax', material: 'iridescent', postProcessing: { bloom: true, vignette: true }, count: 18, starfield: true, colors: { bgDark: '#2a1f3d', bgMid: '#5b4a7a', accentPrimary: '#7fc4e8', accentSecondary: '#ffb6c9', cream: '#fdf0e0' } },
];

export interface ResolvedTheme extends ThemeConfig {}

export function getThemeForId(id: string, colorOverrides: Record<string, string> | null): ResolvedTheme {
  const base = THEME_CONFIGS.find((t) => t.id === id) ?? THEME_CONFIGS[0];
  return {
    ...base,
    colors: { ...base.colors, ...(colorOverrides ?? {}) },
  };
}
