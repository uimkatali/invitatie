import { describe, it, expect } from 'vitest';
import { SCENE_THEMES, particleCounts, TOTAL_PARTICLES } from './themes';
import { THEMES } from '../domain';

describe('SCENE_THEMES', () => {
  it('configures every theme with a palette for each of its kinds', () => {
    for (const id of THEMES) {
      const theme = SCENE_THEMES[id];
      expect(theme.kinds.length).toBeGreaterThan(0);
      for (const kind of theme.kinds) expect(theme.palette[kind].length).toBeGreaterThan(0);
    }
  });

  it('uses only leaves for toamna and only snowflakes for iarna', () => {
    expect(SCENE_THEMES.toamna.kinds).toEqual(['leaf']);
    expect(SCENE_THEMES.iarna.kinds).toEqual(['snowflake']);
    expect(SCENE_THEMES.amandoua.kinds).toEqual(['leaf', 'snowflake']);
  });
});

describe('particleCounts', () => {
  it('splits the budget exactly across the theme kinds', () => {
    const counts = particleCounts(SCENE_THEMES.amandoua, TOTAL_PARTICLES.desktop);
    expect(counts.leaf + counts.snowflake).toBe(TOTAL_PARTICLES.desktop);
    expect(particleCounts(SCENE_THEMES.iarna, 81)).toEqual({ leaf: 0, snowflake: 81 });
  });
});
