This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

A markdown editor + preview app with a per-user private library. Each user signs in
with Google (via [Auth.js / NextAuth v5](https://authjs.dev)) and only ever sees and
manages **their own** saved files.

## Authentication & per-user data

Every saved markdown file is owned by a `User` (`MarkdownFile.userId`). All API
routes resolve the current session with `auth()` and scope their queries to
`session.user.id`, so users cannot read, edit, or delete another user's files.
Page routes are gated by `src/middleware.ts`, which redirects unauthenticated
visitors to `/signin`.

Key files:

| File | Purpose |
|------|---------|
| `src/auth.config.ts` | Edge-safe Auth.js config (providers, callbacks) used by middleware |
| `src/auth.ts` | Full Auth.js instance with the Prisma adapter (`handlers`, `auth`, `signIn`, `signOut`) |
| `src/middleware.ts` | Redirects unauthenticated users to `/signin` |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `src/app/signin/page.tsx` | "Continue with Google" sign-in screen |
| `src/components/UserMenu.tsx` | Avatar + sign-out menu in the header |

## Getting Started

### 1. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

- `DATABASE_URL` — your PostgreSQL connection string.
- `AUTH_SECRET` — generate with `npx auth secret` (or `openssl rand -base64 33`).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from the Google Cloud Console.
- `AUTH_ALLOWED_EMAILS` / `AUTH_ALLOWED_DOMAINS` — *optional* sign-in allowlist.
  Leave both unset for open sign-up; set either to restrict who can sign in (see
  [src/lib/access.ts](src/lib/access.ts)).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — *optional* (recommended
  in production) per-user write rate limiting via Upstash Redis. When unset, the
  limiter is a no-op (see [src/lib/ratelimit.ts](src/lib/ratelimit.ts)).

> **Security headers:** baseline response headers (HSTS, `X-Content-Type-Options`,
> `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are applied to every
> route in [next.config.ts](next.config.ts). A Content-Security-Policy is tracked
> separately — see `docs/IMPROVEMENT_PLAN.md` §2.3.

### 2. Create Google OAuth credentials

1. Go to the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Configure the OAuth consent screen (External), add your email as a test user.
3. Create an **OAuth client ID** → **Web application**.
4. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-domain.com/api/auth/callback/google` (production)
5. Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

### 3. Apply the database schema

The schema adds the Auth.js tables (`User`, `Account`, `Session`,
`VerificationToken`) and an owner relation on `MarkdownFile`. Apply it with:

```bash
npx prisma migrate dev --name add-google-auth   # creates + runs a migration
# or, without migration history:
npx prisma db push
```

> **Note:** `MarkdownFile.userId` is required. If you already have rows from
> before auth was added, either truncate the table or backfill `userId` to a
> real user before applying the schema.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
