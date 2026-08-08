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

  it('includes the original alien-field theme unchanged in spirit', () => {
    const alien = THEME_CONFIGS.find((t) => t.id === 'alien-field');
    expect(alien).toBeDefined();
    expect(alien!.particleShape).toBe('alienCreature');
  });
});

describe('getThemeForId', () => {
  it('returns the matching theme config with default colors when no override given', () => {
    const theme = getThemeForId('alien-field', null);
    expect(theme.id).toBe('alien-field');
    expect(theme.colors.accentPrimary).toBe('#7fc4e8');
  });

  it('applies color overrides on top of the base theme', () => {
    const theme = getThemeForId('alien-field', { accentPrimary: '#ff0000' });
    expect(theme.colors.accentPrimary).toBe('#ff0000');
    expect(theme.colors.bgDark).toBe('#2a1f3d');
  });

  it('falls back to the first theme for an unknown id rather than throwing', () => {
    const theme = getThemeForId('does-not-exist', null);
    expect(theme.id).toBe(THEME_CONFIGS[0].id);
  });
});
