import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // mh_session is a non-sensitive indicator cookie set by the frontend on login.
  // The actual httpOnly mh_access token lives on the API domain (Railway) and
  // is invisible to this middleware — we use mh_session purely for routing.
  const session = request.cookies.get('mh_session');
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand|api).*)',
  ],
};
