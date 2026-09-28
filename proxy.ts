import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from './lib/auth/session';
import { buildCsp } from './lib/security/csp';

const PUBLIC_PATHS = new Set(['/login']);

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const { pathname } = request.nextUrl;

  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return withCsp(NextResponse.json({ error: 'Neautentificat' }, { status: 401 }), csp);
    }
    return withCsp(NextResponse.redirect(new URL('/login', request.url)), csp);
  }

  if (user && isPublic) {
    return withCsp(NextResponse.redirect(new URL('/', request.url)), csp);
  }

  // Next citeste nonce-ul din header-ul CSP al request-ului si il pune pe scripturile lui.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
