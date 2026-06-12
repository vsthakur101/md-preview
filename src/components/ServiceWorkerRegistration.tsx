'use client';

import { useEffect } from 'react';

/**
 * Registers the offline-reading service worker (public/sw.js).
 * Production only — a SW in dev makes hot-reload debugging miserable.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
