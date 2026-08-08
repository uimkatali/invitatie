import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyPassword } from '../../../../lib/password';
import { createSessionToken } from '../../../../lib/session';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username si parola sunt obligatorii.' }, { status: 400 });
  }

  const { rows } = await sql`SELECT password_hash FROM admin_user WHERE username = ${username}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Credentiale incorecte.' }, { status: 401 });
  }

  const valid = await verifyPassword(password, rows[0].password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Credentiale incorecte.' }, { status: 401 });
  }

  const token = await createSessionToken(process.env.SESSION_SECRET!);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
