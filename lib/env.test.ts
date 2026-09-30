import { describe, it, expect } from 'vitest';
import { parseEnv, EnvError } from './env';

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
  GMAIL_USER: 'sender@gmail.com',
  GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_123',
};

describe('parseEnv', () => {
  it('accepts a complete env and decodes the base64 hashes', () => {
    const env = parseEnv(valid);
    expect(env.USER_EL_PASSWORD_HASH).toBe(FAKE_HASH);
    expect(env.EMAIL_EA).toBeNull();
  });

  it('strips all whitespace from the Gmail app password (Google shows it in groups of four)', () => {
    expect(parseEnv(valid).GMAIL_APP_PASSWORD).toBe('abcdefghijklmnop');
    const messy = ['  abcd', 'efgh ijkl mnop '].join(String.fromCharCode(9)) + String.fromCharCode(10);
    expect(parseEnv({ ...valid, GMAIL_APP_PASSWORD: messy }).GMAIL_APP_PASSWORD).toBe('abcdefghijklmnop');
  });

  it('treats missing or empty email settings as disabled (null), not as an error', () => {
    const { GMAIL_USER: _u, GMAIL_APP_PASSWORD: _p, EMAIL_EL: _l, ...rest } = valid;
    void [_u, _p, _l];
    const env = parseEnv({ ...rest, EMAIL_EA: '', GMAIL_USER: '', GMAIL_APP_PASSWORD: '   ' });
    expect(env.GMAIL_USER).toBeNull();
    expect(env.GMAIL_APP_PASSWORD).toBeNull();
    expect(env.EMAIL_EL).toBeNull();
    expect(env.EMAIL_EA).toBeNull();
  });

  it('accepts addresses for both partners', () => {
    const env = parseEnv({ ...valid, EMAIL_EL: 'el@example.com', EMAIL_EA: 'ea@example.com' });
    expect(env.EMAIL_EL).toBe('el@example.com');
    expect(env.EMAIL_EA).toBe('ea@example.com');
  });

  it('rejects a malformed address and names the variable without echoing it', () => {
    expect(() => parseEnv({ ...valid, EMAIL_EA: 'not-an-email' })).toThrow(/EMAIL_EA/);
    expect(() => parseEnv({ ...valid, GMAIL_USER: 'nope' })).toThrow(/GMAIL_USER/);
    expect(() => parseEnv({ ...valid, EMAIL_EL: 'secret-not-email' })).not.toThrow(/secret-not-email/);
  });

  it('needs no email provider key besides the optional Gmail settings', () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it('rejects a short session secret and names the variable', () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects a hash that is not base64 bcrypt', () => {
    expect(() => parseEnv({ ...valid, USER_EA_PASSWORD_HASH: FAKE_HASH })).toThrow(/USER_EA_PASSWORD_HASH/);
  });

  it('rejects a bcrypt hash with a cost below 12', () => {
    const weakHash = '$2b$04$' + 'a'.repeat(53);
    expect(() => parseEnv({ ...valid, USER_EA_PASSWORD_HASH: b64(weakHash) })).toThrow(/USER_EA_PASSWORD_HASH/);
  });

  it('rejects identical usernames', () => {
    expect(() => parseEnv({ ...valid, USER_EA_NAME: 'CATALIN' })).toThrow(/USER_EA_NAME/);
  });

  it('lists every missing variable', () => {
    expect(() => parseEnv({})).toThrow(new RegExp('DATABASE_URL.*SESSION_SECRET', 's'));
  });
});

describe('EnvError', () => {
  it('is thrown by parseEnv, names the variables and never echoes their values', () => {
    const secretValue = 'super-secret-value-that-is-too-short';
    let caught: unknown;
    try {
      parseEnv({ ...valid, SESSION_SECRET: 'short', DATABASE_URL: secretValue });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(EnvError);
    const error = caught as EnvError;
    expect(error.name).toBe('EnvError');
    expect(error.message).toMatch(/^Variabile de mediu lipsa sau invalide: /);
    expect(error.message).toMatch(/SESSION_SECRET/);
    expect(error.message).toMatch(/DATABASE_URL/);
    expect(error.message).not.toContain(secretValue);
    expect(error.message).not.toContain('short)');
  });
});
