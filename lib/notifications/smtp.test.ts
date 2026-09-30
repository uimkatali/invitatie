import { describe, it, expect } from 'vitest';
import { gmailSmtpOptions, maskEmail, smtpErrorCode, smtpHint } from './smtp.mjs';

describe('gmailSmtpOptions', () => {
  it('uses Gmail SMTP over implicit TLS with bounded timeouts', () => {
    const options = gmailSmtpOptions('sender@gmail.com', 'secretpass');
    expect(options).toMatchObject({ host: 'smtp.gmail.com', port: 465, secure: true });
    expect(options.auth).toEqual({ user: 'sender@gmail.com', pass: 'secretpass' });
    for (const key of ['connectionTimeout', 'greetingTimeout', 'socketTimeout'] as const) {
      expect(options[key]).toBeGreaterThan(0);
      expect(options[key]).toBeLessThanOrEqual(15_000);
    }
  });
});

describe('maskEmail', () => {
  it('keeps the first letter and the domain only', () => {
    expect(maskEmail('catalin@gmail.com')).toBe('c***@gmail.com');
    expect(maskEmail('  ea@example.com ')).toBe('e***@example.com');
  });

  it('hides anything that is not an address', () => {
    expect(maskEmail('')).toBe('***');
    expect(maskEmail('nu-e-adresa')).toBe('***');
    expect(maskEmail('@gmail.com')).toBe('***');
    expect(maskEmail(undefined)).toBe('***');
  });
});

describe('smtpErrorCode', () => {
  it('returns a short nodemailer or network code', () => {
    expect(smtpErrorCode(Object.assign(new Error('x'), { code: 'EAUTH' }))).toBe('EAUTH');
    expect(smtpErrorCode({ code: 'ECONNECTION' })).toBe('ECONNECTION');
  });

  it('ignores anything that is not a short uppercase code, and never reads the message', () => {
    expect(smtpErrorCode(new Error('535 user@gmail.com bad credentials'))).toBeNull();
    expect(smtpErrorCode({ code: 'secret@gmail.com' })).toBeNull();
    expect(smtpErrorCode({ code: 535 })).toBeNull();
    expect(smtpErrorCode(null)).toBeNull();
    expect(smtpErrorCode('EAUTH')).toBeNull();
  });
});

describe('smtpHint', () => {
  it('explains the common failures in Romanian', () => {
    expect(smtpHint('EAUTH')).toMatch(/parola de aplicatie.*2 pasi/);
    expect(smtpHint('ETIMEDOUT')).toMatch(/465/);
    expect(smtpHint('ECONNECTION')).toMatch(/smtp\.gmail\.com/);
    expect(smtpHint('SOMETHING_ELSE')).toBeNull();
    expect(smtpHint(null)).toBeNull();
  });
});
