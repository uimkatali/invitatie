'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { env } from '@/lib/env';
import { getDb } from '@/lib/db/client';
import { authenticate } from '@/lib/auth/credentials';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { hashIp, reserveAttempt, exceedsLimit, clearAttempts } from '@/lib/auth/rate-limit';
import { clientIpFrom } from '@/lib/auth/client-ip';
import { pickStrings } from '@/lib/form';
import { log, errorName } from '@/lib/log';
import { GENERIC_ERROR, type ActionState } from '@/lib/result';

const WRONG_CREDENTIALS = 'Utilizator sau parola gresite.';
const TOO_MANY = 'Utilizator sau parola gresite. Prea multe incercari, incearca din nou peste 15 minute.';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = pickStrings(formData, ['username', 'password']);
  // Ecoul din formular e limitat la 100 caractere indiferent de ramura: username-ul brut
  // (nevalidat inca) poate depasi lungimea acceptata de schema.
  const echo = { username: values.username.slice(0, 100) };
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: WRONG_CREDENTIALS, values: echo };

  try {
    const e = env();
    const db = getDb();
    const now = new Date();
    const ipHash = hashIp(clientIpFrom(await headers()), e.SESSION_SECRET);

    // Rezervarea se face INAINTE de verificarea parolei si conteaza automat incercarea
    // curenta (atomic, vezi lib/auth/rate-limit.ts): daca autentificarea esueaza mai jos,
    // nu mai inregistram inca o data esecul, e deja numarat.
    const attempts = await reserveAttempt(db, ipHash, now);
    if (exceedsLimit(attempts)) {
      log('warn', 'login_rate_limited');
      return { ok: false, error: TOO_MANY, values: echo };
    }

    const user = await authenticate(parsed.data.username, parsed.data.password, [
      { id: 'el', name: e.USER_EL_NAME, passwordHash: e.USER_EL_PASSWORD_HASH },
      { id: 'ea', name: e.USER_EA_NAME, passwordHash: e.USER_EA_PASSWORD_HASH },
    ]);

    if (!user) {
      log('warn', 'login_failed');
      return { ok: false, error: WRONG_CREDENTIALS, values: echo };
    }

    // Best-effort: daca stergerea esueaza, urmatorul login reusit o va relua: nu merita
    // sa transformam un login altfel reusit intr-o eroare pentru client.
    await clearAttempts(db, ipHash).catch((err) => log('warn', 'login_clear_attempts_failed', { reason: errorName(err) }));
    const token = await signSession(user, e.SESSION_SECRET, now);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    log('info', 'login_ok', { user });
  } catch (err) {
    log('error', 'login_error', { reason: errorName(err) });
    return { ok: false, error: GENERIC_ERROR, values: echo };
  }

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
