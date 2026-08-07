import { describe, it, expect } from 'vitest';
import { checkCredentials } from './auth';

describe('checkCredentials', () => {
  it('returns true for matching username and password', () => {
    expect(checkCredentials('fatamisterioasa', 'elefant123', 'fatamisterioasa', 'elefant123')).toBe(true);
  });

  it('is case-insensitive and trims whitespace on the username', () => {
    expect(checkCredentials('  FataMisterioasa  ', 'elefant123', 'fatamisterioasa', 'elefant123')).toBe(true);
  });

  it('requires an exact, case-sensitive password match', () => {
    expect(checkCredentials('fatamisterioasa', 'Elefant123', 'fatamisterioasa', 'elefant123')).toBe(false);
  });

  it('returns false for a wrong username', () => {
    expect(checkCredentials('altcineva', 'elefant123', 'fatamisterioasa', 'elefant123')).toBe(false);
  });

  it('returns false for a wrong password', () => {
    expect(checkCredentials('fatamisterioasa', 'gresit', 'fatamisterioasa', 'elefant123')).toBe(false);
  });

  it('returns false for empty username and password', () => {
    expect(checkCredentials('', '', 'fatamisterioasa', 'elefant123')).toBe(false);
  });
});
