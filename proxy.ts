import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from './lib/auth/session';
import { buildCsp } from './lib/security/csp';
import { log } from './lib/log';

const PUBLIC_PATHS = new Set(['/login']);
const MIN_SECRET_LENGTH = 32;

// Fail closed daca SESSION_SECRET lipseste sau e prea scurt, dar loga o singura data per proces
// (proxy ruleaza pe fiecare request, nu vrem sa inundam log-urile).
let loggedInvalidSecret = false;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? '';
  if (secret.length < MIN_SECRET_LENGTH && !loggedInvalidSecret) {
    loggedInvalidSecret = true;
    log('error', 'session_secret_invalid');
  }
  return secret;
}

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const { pathname } = request.nextUrl;

  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  const isPublic = PUBLIC_PATHS.has(pathname);
  // POST-urile de Server Actions poarta header-ul next-action; fiecare Server Action isi verifica
  // singura sesiunea prin requireSession() (care redirecteaza via protocolul de actiuni al Next),
  // asa ca proxy-ul nu trebuie sa le blocheze sau sa le redirecteze aici.
  const isAction = request.headers.has('next-action');

  // Next citeste nonce-ul din header-ul CSP al request-ului si il pune pe scripturile lui.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  if (isAction) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  }

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return withCsp(NextResponse.json({ error: 'Neautentificat' }, { status: 401 }), csp);
    }
    return withCsp(NextResponse.redirect(new URL('/login', request.url)), csp);
  }

  if (user && isPublic) {
    return withCsp(NextResponse.redirect(new URL('/', request.url)), csp);
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
