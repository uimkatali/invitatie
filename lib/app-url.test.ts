import { describe, it, expect } from 'vitest';
import { appUrl } from './app-url';

describe('appUrl', () => {
  it('prefers APP_URL without trailing slash', () => {
    expect(appUrl({ APP_URL: 'https://noi.example.com/' })).toBe('https://noi.example.com');
  });

  it('falls back to the Vercel production url', () => {
    expect(appUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'dateuri.vercel.app' })).toBe('https://dateuri.vercel.app');
  });

  it('falls back to localhost', () => {
    expect(appUrl({})).toBe('http://localhost:3000');
  });
});
