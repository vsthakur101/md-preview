/**
 * Share-link expiry helpers. A null expiry means the link never expires.
 */

/** Allowed durations offered in the share UI (days). 0 = never. */
export const SHARE_EXPIRY_OPTIONS = [
  { days: 0, label: 'Never' },
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

export function isShareExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return expiresAt != null && expiresAt.getTime() <= now.getTime();
}

/** Resolve a requested duration (days) to a concrete expiry, or null for never. */
export function expiryFromDays(days: number, now: Date = new Date()): Date | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(now.getTime() + Math.min(days, 365) * 86_400_000);
}
