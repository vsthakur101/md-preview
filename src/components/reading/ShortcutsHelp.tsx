'use client';

import { AnimatePresence, motion } from 'framer-motion';

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['j'], action: 'Next section' },
  { keys: ['k'], action: 'Previous section' },
  { keys: ['f'], action: 'Toggle focus mode' },
  { keys: ['t'], action: 'Table of contents' },
  { keys: ['n'], action: 'Next related read' },
  { keys: ['?'], action: 'Show this help' },
  { keys: ['Esc'], action: 'Close / exit focus' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Keyboard shortcut reference, opened with "?" inside the reader. */
export default function ShortcutsHelp({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="reading-shortcuts" role="dialog" aria-label="Keyboard shortcuts">
          <motion.button
            className="reading-toc-scrim"
            aria-label="Close keyboard shortcuts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="reading-shortcuts-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <p className="reading-toc-label">Keyboard shortcuts</p>
            <ul>
              {SHORTCUTS.map((s) => (
                <li key={s.action}>
                  <span className="reading-shortcuts-action">{s.action}</span>
                  <span className="reading-shortcuts-keys">
                    {s.keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
