import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns `false` during SSR and the first client render, then `true`.
 * Lets components defer client-only UI (localStorage reads, theme) without a
 * setState-in-effect and without a hydration mismatch.
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
