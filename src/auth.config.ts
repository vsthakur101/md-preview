import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { isEmailAllowed } from '@/lib/access';

/**
 * Edge-safe Auth.js configuration.
 *
 * This object is intentionally free of any Node-only dependencies (the Prisma
 * adapter, the `pg` driver, etc.) so it can run inside the middleware on the
 * Edge runtime. The full configuration that wires in the database adapter lives
 * in `auth.ts` and spreads this object.
 */
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    // Gate sign-in behind the optional email/domain allowlist. Returning false
    // aborts the flow before any user/account row is persisted.
    signIn({ user, profile }) {
      return isEmailAllowed(user.email ?? profile?.email);
    },
    // Persist the database user id onto the JWT on first sign-in.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Expose the user id to the session consumed by the app.
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
