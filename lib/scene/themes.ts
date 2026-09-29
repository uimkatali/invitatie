import type { ThemeId } from '../domain';

export type ParticleKind = 'leaf' | 'snowflake';

export interface SceneTheme {
  id: ThemeId;
  kinds: ParticleKind[];
  palette: Record<ParticleKind, string[]>;
  sky: { top: string; bottom: string };
  fog: string;
}

export const SCENE_THEMES: Record<ThemeId, SceneTheme> = {
  toamna: {
    id: 'toamna',
    kinds: ['leaf'],
    palette: { leaf: ['#FFAFCC', '#FFC8DD', '#FFD6C2', '#F9A8C0', '#FFE0EC'], snowflake: [] },
    sky: { top: '#FFC8DD', bottom: '#FFF8FB' },
    fog: '#FFE3EE',
  },
  iarna: {
    id: 'iarna',
    kinds: ['snowflake'],
    palette: { leaf: [], snowflake: ['#FFFFFF', '#E3F1FF', '#BDE0FE', '#A2D2FF'] },
    sky: { top: '#A2D2FF', bottom: '#FFFFFF' },
    fog: '#E3F1FF',
  },
  amandoua: {
    id: 'amandoua',
    kinds: ['leaf', 'snowflake'],
    palette: { leaf: ['#FFAFCC', '#FFC8DD', '#FFD6C2'], snowflake: ['#FFFFFF', '#BDE0FE', '#A2D2FF'] },
    sky: { top: '#FFC8DD', bottom: '#BDE0FE' },
    fog: '#EAD9F2',
  },
};

export const TOTAL_PARTICLES = { desktop: 220, mobile: 80, reduced: 12 } as const;

export function particleCounts(theme: SceneTheme, budget: number): Record<ParticleKind, number> {
  const counts: Record<ParticleKind, number> = { leaf: 0, snowflake: 0 };
  const share = Math.floor(budget / theme.kinds.length);
  theme.kinds.forEach((kind, index) => {
    counts[kind] = index === 0 ? budget - share * (theme.kinds.length - 1) : share;
  });
  return counts;
}
