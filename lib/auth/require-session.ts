import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserId } from '../domain';
import { env } from '../env';
import { SESSION_COOKIE, verifySession } from './session';

/** Userul din cookie, sau null. Pentru route handlers (care raspund cu 401). */
export async function getSessionUser(): Promise<UserId | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, env().SESSION_SECRET);
}

/** Pentru pagini si Server Actions: redirect la /login fara sesiune. */
export async function requireSession(): Promise<UserId> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}
