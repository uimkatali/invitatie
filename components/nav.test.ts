import { describe, it, expect } from 'vitest';
import { buildNav, isActiveLink } from './nav';

describe('buildNav', () => {
  it('puts the unread count on the notifications item only', () => {
    const items = buildNav(3);
    expect(items.map((i) => i.href)).toEqual(['/', '/calendar', '/idei', '/invitatii/noua', '/notificari']);
    expect(items.find((i) => i.href === '/notificari')?.badge).toBe(3);
    expect(items.filter((i) => i.badge).length).toBe(1);
  });
});

describe('isActiveLink', () => {
  it('matches the home link only on the exact path', () => {
    expect(isActiveLink('/', '/')).toBe(true);
    expect(isActiveLink('/calendar', '/')).toBe(false);
  });

  it('matches section links on the path and on its sub-paths', () => {
    expect(isActiveLink('/calendar', '/calendar')).toBe(true);
    expect(isActiveLink('/calendar/extra', '/calendar')).toBe(true);
    expect(isActiveLink('/calendarx', '/calendar')).toBe(false);
    expect(isActiveLink('/invitatii/noua', '/invitatii/noua')).toBe(true);
    expect(isActiveLink('/invitatii/abc', '/invitatii/noua')).toBe(false);
  });
});
