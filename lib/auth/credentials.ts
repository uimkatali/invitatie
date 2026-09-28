import type { UserId } from '../domain';
import { hashPassword, verifyPassword } from './password';

export interface UserCredential {
  id: UserId;
  name: string;
  passwordHash: string;
}

let dummyHash: Promise<string> | null = null;

// Pentru un username necunoscut tot rulam un bcrypt.compare,
// ca timpul de raspuns sa nu arate daca username-ul exista.
function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword('parola-inexistenta-pentru-timp-constant');
  return dummyHash;
}

export async function authenticate(
  username: string,
  password: string,
  users: UserCredential[],
): Promise<UserId | null> {
  const normalized = username.trim().toLowerCase();
  const match = users.find((u) => u.name.trim().toLowerCase() === normalized);
  const hash = match ? match.passwordHash : await getDummyHash();
  const valid = await verifyPassword(password, hash);
  return match && valid ? match.id : null;
}
