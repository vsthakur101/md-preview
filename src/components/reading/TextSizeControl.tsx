'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  TEXT_SIZES,
  setTextSize,
  useTextSize,
  setReadingTheme,
  useReadingTheme,
  type ReadingTheme,
} from '@/hooks/use-reading-prefs';

const READING_THEMES: { id: ReadingTheme; label: string; hint: string }[] = [
  { id: 'default', label: 'Match app', hint: 'light / dark' },
  { id: 'sepia', label: 'Sepia', hint: 'warm paper' },
];

/** "Aa" chrome button + popover for the reader's appearance preferences. */
export default function TextSizeControl() {
  const size = useTextSize();
  const theme = useReadingTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside-click / Escape to close. (No fixed-position scrim here: the chrome
  // bar's backdrop-filter makes it the containing block for fixed children, so
  // a scrim could never cover the viewport.)
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        // Capture phase + stop: Esc should only close the popover, not also
        // trip the reader's own Esc handling (focus mode, TOC).
        e.stopPropagation();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [open]);

  return (
    <div className="reading-textsize" ref={rootRef}>
      <button
        className={`reading-icon-btn${open ? ' is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Text size"
        aria-expanded={open}
        title="Text size"
      >
        <span className="reading-textsize-glyph" aria-hidden>
          Aa
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="reading-textsize-pop"
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {TEXT_SIZES.map((s) => (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={size === s.id}
                className={`reading-textsize-opt${size === s.id ? ' is-active' : ''}`}
                onClick={() => setTextSize(s.id)}
              >
                <span
                  className="reading-textsize-sample"
                  style={{ fontSize: `${0.55 + s.px / 36}rem` }}
                  aria-hidden
                >
                  A
                </span>
                {s.label}
                <span className="reading-textsize-px">{s.px}px</span>
              </button>
            ))}

            <div className="reading-textsize-divider" role="separator" />

            {READING_THEMES.map((t) => (
              <button
                key={t.id}
                role="menuitemradio"
                aria-checked={theme === t.id}
                className={`reading-textsize-opt${theme === t.id ? ' is-active' : ''}`}
                onClick={() => setReadingTheme(t.id)}
              >
                <span
                  className={`reading-theme-swatch reading-theme-swatch-${t.id}`}
                  aria-hidden
                />
                {t.label}
                <span className="reading-textsize-px">{t.hint}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
