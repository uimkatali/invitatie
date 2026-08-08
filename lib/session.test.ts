import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

const SECRET = 'test-secret-at-least-32-characters-long';

describe('createSessionToken / verifySessionToken', () => {
  it('creates a token that verifies as valid', async () => {
    const token = await createSessionToken(SECRET);
    const result = await verifySessionToken(token, SECRET);
    expect(result.valid).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(SECRET);
    const result = await verifySessionToken(token, 'a-completely-different-secret-value');
    expect(result.valid).toBe(false);
  });

  it('rejects a garbage string', async () => {
    const result = await verifySessionToken('not-a-real-token', SECRET);
    expect(result.valid).toBe(false);
  });
});
