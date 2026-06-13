# CLAUDE.md — md-preview

Project context for Claude Code. Keep this concise and current.

## What this is

A markdown app evolving into a **retention-optimized long-form reading platform**:
users upload `.md` files, save them to a per-user library, and read them in a
reading experience engineered to keep low-attention readers engaged on 30–60 min
articles. The product north star is **retention** — visible progress, momentum,
micro-rewards, zero-friction return. See `docs/READING_PLATFORM_SPEC.md` for the
full brief and `docs/IMPROVEMENT_PLAN.md` for the broader plan.

## Stack (actual, not aspirational)

- **Next.js 16** (App Router) + **React 19.2**, **TypeScript** (strict).
  - Note: an external brief said "Next 14"; we build on the installed 16. App
    Router + RSC satisfy every requirement. Do not downgrade.
- **Tailwind CSS v4** (`@theme`, class-based dark via `@custom-variant` + `next-themes`).
- **Prisma 7** + **PostgreSQL** (Neon), `pg` adapter (`src/lib/prisma.ts`).
- **Auth.js v5 (NextAuth)**, Google OAuth, JWT sessions (`src/auth.ts`, `auth.config.ts`).
- Reader markdown pipeline: **server-side `unified`** (remark → rehype → Shiki via
  `rehype-pretty-code` → stringify). Never ship raw markdown to the client to parse.
- **Framer Motion** for subtle reading-flow animation.

## Architecture map

| Area | Files |
|------|-------|
| Auth + per-user scoping | `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts` |
| Data access | `src/lib/prisma.ts`, API routes under `src/app/api/files` |
| Editor / library (legacy surface) | `src/app/page.tsx`, `src/app/library/**` |
| **Reader** | `src/app/read/[id]/`, `src/lib/reading/markdown.ts`, `src/components/reading/**` |
| Sharing | `/api/files/[id]/share`, public `/share/[shareId]` |

Every `/api/files*` route resolves `await auth()` and scopes queries to
`session.user.id`. The reader route loads a file the same way (owner-only).

## Reading platform — principles & phase order

A long read must *feel* like a sequence of 90-second wins. Build in this order:

1. **Foundation** — humanist serif body (Newsreader), 19–21px / 1.7 line-height,
   warm canvas (`#FAFAF8` / dark `#1A1A18`), **content column capped at 62–68ch
   (~680px)**. The measure cap is the single highest-impact rule; never exceed it.
2. **Progress engine** — thin top scroll progress bar; **shrinking "time left"**
   (not static total); floating TOC auto-built from `##`/`###` with per-section
   read time and a checkmark as each section is passed.
3. **Hold the reader** — auto-resume scroll position per article; focus mode
   (spotlight current paragraph); chunking: drop caps, section dividers, pull-quotes.
4. **Investment** — inline highlighting, per-paragraph reactions, `:::key` callouts,
   `:::aside` collapsibles.
5. **Stay-longer loop** — related reads before the footer, highlights recap, streak.

Custom markdown blocks (remark-directive): `:::key` → takeaway card, `:::aside` →
collapsed `<details>` deep-dive. Short standalone `> quotes` may auto-promote to pull-quotes.

## Commands

```bash
npm run dev          # Next dev server
npm run build        # prisma generate + next build (use to validate all routes)
npm run lint         # eslint (must stay at 0 errors)
npm test             # vitest
npx prisma db push   # apply schema changes (no migration history in this repo)
```

## Conventions

- TypeScript strict; avoid `any` (unified plugins are the pragmatic exception).
- Functional components, named exports, `handle*` event handlers, `use*` hooks.
- Branch off `main`; never commit to `main`. Conventional Commits. End commit
  messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Lint rules `react-hooks/refs` and `react-hooks/set-state-in-effect` are
  enforced — don't read refs in render or call setState synchronously in effects
  (use `useSyncExternalStore` mount-gating; see `src/hooks/use-mounted.ts`).
- Verify UI work with `npm run build` (auth-gates block curl); the reader route's
  article HTML is server-rendered into the initial payload.

## Gotchas

- The dev DB tracks `feat/reading-platform`'s schema (`shareId`, `shareExpiresAt`,
  `MarkdownFile.pinned`, `MarkdownFile.tags`, `MarkdownFile.deletedAt`,
  `Highlight.note`, `ReadingProgress` table); `main`'s schema may lag behind it.
  Reconcile before `prisma db push` from a fresh branch.
- File deletes are soft (`deletedAt`); every owner-scoped query must filter
  `deletedAt: null`. Purge of 30-day-old rows piggybacks on `GET /api/files`.
- `MarkdownFile.userId` is required (`NOT NULL`); new rows must set it.
