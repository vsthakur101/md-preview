import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

/**
 * Gate every page route behind an authenticated session. Unauthenticated users
 * are bounced to `/signin` with a `callbackUrl` so they land back where they
 * started after signing in.
 *
 * API routes are intentionally excluded from the matcher and instead enforce
 * auth themselves (returning 401 rather than an HTML redirect).
 */
export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/signin', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|signin).*)'],
};
