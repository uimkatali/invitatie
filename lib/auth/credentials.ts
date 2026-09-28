import type { UserId } from '../domain';
import { verifyPassword } from './password';

export interface UserCredential {
  id: UserId;
  name: string;
  passwordHash: string;
}

// Hash bcrypt precalculat (nu e secret) pentru un username necunoscut: rulam tot un
// bcrypt.compare, ca timpul de raspuns sa nu arate daca username-ul exista.
const DUMMY_HASH = '$2b$12$Sjph1DgWfZa6nlVMnt6Dm.Ct4dTvyfmUN2Ro64e2tm5QZ1hvPBgLq';

// NFC: 'a' + combining tilde si 'ã' precompus trebuie sa se potriveasca la login.
function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().normalize('NFC');
}

export async function authenticate(
  username: string,
  password: string,
  users: UserCredential[],
): Promise<UserId | null> {
  const normalized = normalizeUsername(username);
  const match = users.find((u) => normalizeUsername(u.name) === normalized);
  const hash = match ? match.passwordHash : DUMMY_HASH;
  const valid = await verifyPassword(password, hash);
  return match && valid ? match.id : null;
}
