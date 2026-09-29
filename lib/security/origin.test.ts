import { describe, it, expect } from 'vitest';
import { isSameOrigin } from './origin';

describe('isSameOrigin', () => {
  it('accepts a matching origin', () => {
    expect(isSameOrigin(new Headers({ origin: 'https://noi.app', host: 'noi.app' }))).toBe(true);
    expect(isSameOrigin(new Headers({ origin: 'https://noi.app', 'x-forwarded-host': 'noi.app', host: 'internal' }))).toBe(true);
  });

  it('rejects other or missing origins', () => {
    expect(isSameOrigin(new Headers({ origin: 'https://evil.example', host: 'noi.app' }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: 'noi.app' }))).toBe(false);
    expect(isSameOrigin(new Headers({ origin: 'null', host: 'noi.app' }))).toBe(false);
  });
});
