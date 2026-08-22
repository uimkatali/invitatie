import { describe, it, expect } from 'vitest';
import { THEME_CONFIGS, getThemeForId } from './themes';

describe('THEME_CONFIGS', () => {
  it('has exactly 15 entries with unique ids and names', () => {
    expect(THEME_CONFIGS).toHaveLength(15);
    const ids = new Set(THEME_CONFIGS.map((t) => t.id));
    const names = new Set(THEME_CONFIGS.map((t) => t.name));
    expect(ids.size).toBe(15);
    expect(names.size).toBe(15);
  });

  it('keeps the original alien creature as one nostalgic legacy option', () => {
    const legacy = THEME_CONFIGS.find((t) => t.id === 'camp-de-alieni-clasic');
    expect(legacy).toBeDefined();
    expect(legacy!.particleShape).toBe('alienCreature');
  });

  it('uses warm/romantic shapes for the rest of the set', () => {
    const romanticShapes = new Set(['petal', 'firefly', 'heart', 'ring', 'ribbon', 'blob', 'star', 'crystal']);
    const nonLegacy = THEME_CONFIGS.filter((t) => t.id !== 'camp-de-alieni-clasic');
    for (const theme of nonLegacy) {
      expect(romanticShapes.has(theme.particleShape)).toBe(true);
    }
  });
});

describe('getThemeForId', () => {
  it('returns the matching theme config with default colors when no override given', () => {
    const theme = getThemeForId('petale-in-vant', null);
    expect(theme.id).toBe('petale-in-vant');
    expect(theme.colors.accentPrimary).toBe('#ff9ab0');
  });

  it('applies color overrides on top of the base theme', () => {
    const theme = getThemeForId('petale-in-vant', { accentPrimary: '#ff0000' });
    expect(theme.colors.accentPrimary).toBe('#ff0000');
    expect(theme.colors.bgDark).toBe('#3d2233');
  });

  it('falls back to the first theme for an unknown id rather than throwing', () => {
    const theme = getThemeForId('does-not-exist', null);
    expect(theme.id).toBe(THEME_CONFIGS[0].id);
  });
});
