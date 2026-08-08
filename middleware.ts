import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './lib/session';

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  const isLoginApi = request.nextUrl.pathname === '/api/admin/login';
  const isSessionApi = request.nextUrl.pathname === '/api/admin/session';
  if (isLoginPage || isLoginApi || isSessionApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_session')?.value;
  const result = token ? await verifySessionToken(token, process.env.SESSION_SECRET!) : { valid: false };

  if (!result.valid) {
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
