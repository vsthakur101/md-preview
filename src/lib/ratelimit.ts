import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Per-user write rate limiting backed by Upstash Redis.
 *
 * Configured via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. When
 * those are absent the limiter degrades to a no-op so local development and the
 * app keep working — but in production a missing config is logged once as a
 * warning, since it means writes are unthrottled.
 *
 * Uses a sliding-window limiter (more accurate than fixed windows at the
 * boundary). Sliding window is the right default for abuse prevention; tune the
 * tokens/interval to taste.
 */
const WRITE_LIMIT = 30; // writes
const WRITE_WINDOW = '60 s';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(WRITE_LIMIT, WRITE_WINDOW),
        analytics: false,
        prefix: 'mdp:write',
      })
    : null;

let warned = false;

/**
 * Enforce the per-user write limit. Returns a ready-to-send 429 `NextResponse`
 * (with a `Retry-After` header) when the caller is over the limit, or `null`
 * when the request may proceed.
 *
 * Usage in a route handler:
 *   const limited = await enforceWriteLimit(session.user.id);
 *   if (limited) return limited;
 */
export async function enforceWriteLimit(userId: string): Promise<NextResponse | null> {
  if (!ratelimit) {
    if (!warned && process.env.NODE_ENV === 'production') {
      console.warn(
        '[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — write rate limiting is disabled'
      );
      warned = true;
    }
    return null;
  }

  const { success, reset } = await ratelimit.limit(`files:${userId}`);
  if (success) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
