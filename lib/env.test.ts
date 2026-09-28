import { describe, it, expect } from 'vitest';
import { parseEnv } from './env';

const FAKE_HASH = '$2b$12$' + 'a'.repeat(53);
const b64 = (s: string) => Buffer.from(s).toString('base64');

const valid = {
  DATABASE_URL: 'mysql://u:p@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/dates',
  SESSION_SECRET: 'x'.repeat(32),
  USER_EL_NAME: 'catalin',
  USER_EL_PASSWORD_HASH: b64(FAKE_HASH),
  USER_EA_NAME: 'iubita',
  USER_EA_PASSWORD_HASH: b64(FAKE_HASH),
  EMAIL_EL: 'el@example.com',
  EMAIL_EA: '',
  RESEND_API_KEY: 're_123',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_123',
};

describe('parseEnv', () => {
  it('accepts a complete env and decodes the base64 hashes', () => {
    const env = parseEnv(valid);
    expect(env.USER_EL_PASSWORD_HASH).toBe(FAKE_HASH);
    expect(env.EMAIL_EA).toBeNull();
  });

  it('rejects a short session secret and names the variable', () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects a hash that is not base64 bcrypt', () => {
    expect(() => parseEnv({ ...valid, USER_EA_PASSWORD_HASH: FAKE_HASH })).toThrow(/USER_EA_PASSWORD_HASH/);
  });

  it('rejects identical usernames', () => {
    expect(() => parseEnv({ ...valid, USER_EA_NAME: 'CATALIN' })).toThrow(/USER_EA_NAME/);
  });

  it('lists every missing variable', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL.*SESSION_SECRET/s);
  });
});
