import { describe, it, expect, beforeAll } from 'vitest';
import { authenticate, type UserCredential } from './credentials';
import { hashPassword } from './password';

let users: UserCredential[];

beforeAll(async () => {
  users = [
    { id: 'el', name: 'Catalin', passwordHash: await hashPassword('parola-el') },
    { id: 'ea', name: 'iubita', passwordHash: await hashPassword('parola-ea') },
  ];
});

describe('authenticate', () => {
  it('matches username case-insensitively and trimmed', async () => {
    expect(await authenticate('  catalin ', 'parola-el', users)).toBe('el');
    expect(await authenticate('IUBITA', 'parola-ea', users)).toBe('ea');
  });

  it('rejects the wrong password', async () => {
    expect(await authenticate('catalin', 'parola-ea', users)).toBeNull();
  });

  it('rejects an unknown user', async () => {
    expect(await authenticate('admin', 'parola-el', users)).toBeNull();
  });

  it('password is case-sensitive', async () => {
    expect(await authenticate('catalin', 'PAROLA-EL', users)).toBeNull();
  });
});
