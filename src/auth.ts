import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

/**
 * Full Auth.js instance used by the server: route handlers, server actions and
 * the `auth()` helper for reading the session in API routes.
 *
 * We use the Prisma adapter to persist `User`/`Account` rows (so we have a
 * stable `User.id` to scope data by), but keep the session strategy as `jwt`
 * so that the middleware can authorize requests on the Edge runtime without a
 * database round-trip.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
});
