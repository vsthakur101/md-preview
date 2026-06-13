import { describe, it, expect } from 'vitest';
import { isShareExpired, expiryFromDays } from './share-expiry';

const NOW = new Date('2026-06-13T12:00:00.000Z');

describe('isShareExpired', () => {
  it('treats null/undefined as never-expiring', () => {
    expect(isShareExpired(null, NOW)).toBe(false);
    expect(isShareExpired(undefined, NOW)).toBe(false);
  });

  it('is expired at or before now', () => {
    expect(isShareExpired(new Date('2026-06-13T12:00:00.000Z'), NOW)).toBe(true);
    expect(isShareExpired(new Date('2026-06-12T00:00:00.000Z'), NOW)).toBe(true);
  });

  it('is valid in the future', () => {
    expect(isShareExpired(new Date('2026-06-20T00:00:00.000Z'), NOW)).toBe(false);
  });
});

describe('expiryFromDays', () => {
  it('returns null for never (0 or negative)', () => {
    expect(expiryFromDays(0, NOW)).toBeNull();
    expect(expiryFromDays(-5, NOW)).toBeNull();
  });

  it('adds the given days', () => {
    expect(expiryFromDays(7, NOW)?.toISOString()).toBe('2026-06-20T12:00:00.000Z');
  });

  it('caps very long durations at a year', () => {
    expect(expiryFromDays(99999, NOW)?.toISOString()).toBe('2027-06-13T12:00:00.000Z');
  });
});
