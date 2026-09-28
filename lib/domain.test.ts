import { describe, it, expect } from 'vitest';
import { isUserId, otherUser, THEMES, THEME_LABELS } from './domain';

describe('otherUser', () => {
  it('returns the other person', () => {
    expect(otherUser('el')).toBe('ea');
    expect(otherUser('ea')).toBe('el');
  });
});

describe('isUserId', () => {
  it('accepts only el and ea', () => {
    expect(isUserId('el')).toBe(true);
    expect(isUserId('ea')).toBe(true);
    expect(isUserId('admin')).toBe(false);
    expect(isUserId(undefined)).toBe(false);
  });
});

describe('THEME_LABELS', () => {
  it('has a label for every theme', () => {
    for (const theme of THEMES) expect(THEME_LABELS[theme]).toBeTruthy();
  });
});
