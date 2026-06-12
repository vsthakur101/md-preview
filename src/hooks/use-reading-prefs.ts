'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reader preferences (text size, reading theme) backed by localStorage,
 * exposed through useSyncExternalStore so SSR renders the default and the
 * client corrects itself after hydration — no setState-in-effect, no
 * hydration mismatch.
 *
 * Only the font size scales; the measure cap (42rem) is fixed by design.
 */

const KEY = 'reading:prefs:size';
const THEME_KEY = 'reading:prefs:theme';

export const TEXT_SIZES = [
  { id: 'small', label: 'Small', px: 18 },
  { id: 'medium', label: 'Medium', px: 20 },
  { id: 'large', label: 'Large', px: 22 },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]['id'];

const DEFAULT_SIZE: TextSizeId = 'medium';

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): TextSizeId {
  try {
    const v = window.localStorage.getItem(KEY);
    return TEXT_SIZES.some((s) => s.id === v) ? (v as TextSizeId) : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}

export function setTextSize(size: TextSizeId): void {
  try {
    window.localStorage.setItem(KEY, size);
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb());
}

export function useTextSize(): TextSizeId {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SIZE);
}

export function textSizePx(size: TextSizeId): number {
  return TEXT_SIZES.find((s) => s.id === size)?.px ?? 20;
}

/* ---- Reading theme: follow the app theme, or force warm sepia paper ----- */

export type ReadingTheme = 'default' | 'sepia';

function getThemeSnapshot(): ReadingTheme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'sepia' ? 'sepia' : 'default';
  } catch {
    return 'default';
  }
}

export function setReadingTheme(theme: ReadingTheme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb());
}

export function useReadingTheme(): ReadingTheme {
  return useSyncExternalStore(subscribe, getThemeSnapshot, () => 'default');
}
