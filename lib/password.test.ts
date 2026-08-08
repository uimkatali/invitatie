import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword/verifyPassword', () => {
  it('produces a hash that verifies against the original password', async () => {
    const hash = await hashPassword('elefant123');
    expect(await verifyPassword('elefant123', hash)).toBe(true);
  });

  it('rejects a wrong password against a real hash', async () => {
    const hash = await hashPassword('elefant123');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same password on repeated calls (salted)', async () => {
    const hashA = await hashPassword('elefant123');
    const hashB = await hashPassword('elefant123');
    expect(hashA).not.toBe(hashB);
  });

  it('returns false for a malformed/non-bcrypt hash rather than throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-real-hash')).resolves.toBe(false);
  });

  it('hashes and verifies an empty-string password correctly', async () => {
    const hash = await hashPassword('');
    expect(await verifyPassword('', hash)).toBe(true);
    expect(await verifyPassword('not-empty', hash)).toBe(false);
  });
});
