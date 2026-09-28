import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, BCRYPT_COST } from './password';

describe('password', () => {
  it('hashes with the configured cost and verifies', async () => {
    const hash = await hashPassword('elefant-roz-123');
    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
    expect(await verifyPassword('elefant-roz-123', hash)).toBe(true);
    expect(await verifyPassword('gresit', hash)).toBe(false);
  });
});
