'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Respects the OS-level `prefers-reduced-motion` setting for every
 * framer-motion animation in the tree (drawers, popovers, toasts, cards).
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
