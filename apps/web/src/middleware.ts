import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — UX & Navigation Guard.
 *
 * ARCHITECTURAL CLARIFICATION (Section 4):
 * This middleware functions strictly as a CLIENT-SIDE NAVIGATION GUARD.
 * It prevents unauthenticated layout flashes and gracefully redirects unauthenticated
 * browsers to /login before page hydration.
 *
 * THIS IS NOT THE SECURITY BOUNDARY.
 * The authoritative security boundary resides strictly in the Node.js/Express backend
 * (`authMiddleware`), which cryptographically verifies the `datachan_session` cookie
 * using the Firebase Admin SDK, validates account status, and enforces RBAC/ownership.
 * No protected API route relies upon or trusts this Next.js middleware.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/workspace',
  '/playground',
  '/learn',
  '/challenges',
  '/modeler',
  '/profile',
  '/settings',
  '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('datachan_session')?.value;

  // 1. If accessing login while already possessing an active session cookie, route to dashboard
  if (pathname === '/login' && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Check if destination route requires authentication
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
