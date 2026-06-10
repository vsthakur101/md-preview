import { useEffect } from 'react';

/**
 * Proportionally sync vertical scroll between two elements (by id). Scrolling
 * either one drives the other to the same fractional position. A short lock
 * (released next frame) prevents the programmatic scroll from echoing back into
 * an infinite feedback loop.
 */
export function useSyncedScroll(aId: string, bId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const a = document.getElementById(aId);
    const b = document.getElementById(bId);
    if (!a || !b) return;

    let lock = false;
    const make = (src: HTMLElement, dst: HTMLElement) => () => {
      if (lock) return;
      lock = true;
      const srcMax = src.scrollHeight - src.clientHeight;
      const dstMax = dst.scrollHeight - dst.clientHeight;
      dst.scrollTop = srcMax > 0 ? (src.scrollTop / srcMax) * dstMax : 0;
      requestAnimationFrame(() => {
        lock = false;
      });
    };

    const onA = make(a, b);
    const onB = make(b, a);
    a.addEventListener('scroll', onA, { passive: true });
    b.addEventListener('scroll', onB, { passive: true });
    return () => {
      a.removeEventListener('scroll', onA);
      b.removeEventListener('scroll', onB);
    };
  }, [aId, bId, enabled]);
}
