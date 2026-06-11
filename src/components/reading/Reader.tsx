'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import HighlightLayer, { type InitialHighlight } from '@/components/reading/HighlightLayer';
import ReactionLayer, { type InitialReaction } from '@/components/reading/ReactionLayer';
import ReadAloud from '@/components/reading/ReadAloud';
import EndMatter, { type RelatedRead } from '@/components/reading/EndMatter';
import { useMounted } from '@/hooks/use-mounted';
import type { ArticleHeading } from '@/lib/reading/markdown';

interface ReaderProps {
  articleId: string;
  title: string;
  minutes: number;
  headings: ArticleHeading[];
  initialHighlights: InitialHighlight[];
  initialReactions: InitialReaction[];
  related: RelatedRead[];
  children: React.ReactNode; // server-rendered <article>
}

const posKey = (id: string) => `reading:pos:${id}`;

function readSavedFraction(id: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = window.localStorage.getItem(posKey(id));
    return v ? Math.min(1, Math.max(0, parseFloat(v))) : 0;
  } catch {
    return 0;
  }
}

export default function Reader({
  articleId,
  title,
  minutes,
  headings,
  initialHighlights,
  initialReactions,
  related,
  children,
}: ReaderProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [focus, setFocus] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  const focusRef = useRef(false);
  const spotRef = useRef<Element | null>(null);

  // Resume: read once on the client; gate display until mounted (no SSR mismatch).
  const [savedFraction] = useState(() => readSavedFraction(articleId));
  const mounted = useMounted();
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const activeRef = useRef(-1);
  const chromeRef = useRef(false);
  const lastYRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus mode: spotlight the block straddling ~40% of the viewport height.
  const applySpotlight = () => {
    const article = document.getElementById('article');
    if (!article) return;
    const line = window.innerHeight * 0.4;
    let chosen: Element | null = null;
    for (const child of Array.from(article.children)) {
      const r = child.getBoundingClientRect();
      if (r.top <= line && r.bottom >= line) {
        chosen = child;
        break;
      }
    }
    if (chosen !== spotRef.current) {
      spotRef.current?.classList.remove('reading-focus');
      chosen?.classList.add('reading-focus');
      spotRef.current = chosen;
    }
  };

  useEffect(() => {
    const headingEls = headings.map((h) => document.getElementById(h.id));
    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const y = window.scrollY;
      const frac = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      if (fillRef.current) fillRef.current.style.width = `${frac * 100}%`;
      if (timeRef.current) {
        const left = Math.max(0, Math.ceil(minutes * (1 - frac)));
        timeRef.current.textContent = left <= 0 ? 'Finished' : `${left} min left`;
      }

      // Active section = last heading scrolled to/past the top band.
      let idx = -1;
      for (let i = 0; i < headingEls.length; i++) {
        const el = headingEls[i];
        if (el && el.getBoundingClientRect().top <= 120) idx = i;
        else break;
      }
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActiveIndex(idx);
      }

      if (focusRef.current) applySpotlight();

      // Auto-hide chrome on scroll-down, reveal on scroll-up.
      const goingDown = y > lastYRef.current;
      if (y > 140 && goingDown && !chromeRef.current) {
        chromeRef.current = true;
        setChromeHidden(true);
      } else if ((!goingDown || y < 140) && chromeRef.current) {
        chromeRef.current = false;
        setChromeHidden(false);
      }
      lastYRef.current = y;

      // Persist resume position (debounced).
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          window.localStorage.setItem(posKey(articleId), frac.toFixed(4));
        } catch {
          /* ignore */
        }
      }, 400);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [articleId, headings, minutes]);

  const scrollToFraction = (frac: number) => {
    const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    window.scrollTo({ top: frac * max, behavior: 'smooth' });
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFocus = () => {
    const next = !focus;
    setFocus(next);
    focusRef.current = next;
    if (next) {
      applySpotlight();
    } else {
      spotRef.current?.classList.remove('reading-focus');
      spotRef.current = null;
    }
  };

  const showResume = mounted && !resumeDismissed && savedFraction > 0.03 && savedFraction < 0.97;

  // Shared by the desktop rail and the mobile drawer.
  const renderTocList = (onNavigate?: () => void) => (
    <ul>
      {headings.map((h, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'upcoming';
        return (
          <li key={h.id} data-depth={h.depth} data-state={state}>
            <button
              onClick={() => {
                scrollToId(h.id);
                onNavigate?.();
              }}
              className="reading-toc-item"
            >
              <span className="reading-toc-marker" aria-hidden>
                {state === 'done' ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </span>
              <span className="reading-toc-text">{h.text}</span>
              <span className="reading-toc-time">{h.minutes}m</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="reader-root" data-focus={focus ? 'on' : 'off'}>
      {/* Scroll progress bar */}
      <div className="reading-progress-track">
        <div ref={fillRef} className="reading-progress-fill" />
      </div>

      {/* Auto-hiding top chrome */}
      <motion.header
        className="reading-chrome"
        initial={false}
        animate={{ y: chromeHidden ? '-110%' : '0%' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Link href={`/library/${articleId}`} className="reading-chrome-back" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        {headings.length > 1 && (
          <button
            className="reading-icon-btn reading-toc-toggle"
            onClick={() => setTocOpen(true)}
            aria-label="Table of contents"
            title="Contents"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <span className="reading-chrome-title">{title}</span>
        <span className="reading-chrome-time">
          <span ref={timeRef}>{minutes} min left</span>
        </span>
        <ReadAloud />
        <button
          className={`reading-icon-btn${focus ? ' is-active' : ''}`}
          onClick={toggleFocus}
          aria-label="Toggle focus mode"
          title="Focus mode"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 12h3M18 12h3M12 3v3M12 18v3" strokeLinecap="round" />
          </svg>
        </button>
        <ThemeToggle />
      </motion.header>

      <div className="reading-layout">
        {/* Floating TOC with checkpoints (desktop) */}
        {headings.length > 1 && (
          <nav className="reading-toc" aria-label="Table of contents">
            <p className="reading-toc-label">Contents</p>
            {renderTocList()}
          </nav>
        )}

        <main className="reading-main">
          {children}
          <EndMatter
            articleId={articleId}
            related={related}
            highlights={initialHighlights.map((h) => ({ id: h.id, text: h.text, color: h.color }))}
          />
        </main>
      </div>

      {/* Mobile TOC drawer */}
      <AnimatePresence>
        {tocOpen && (
          <div className="reading-toc-drawer">
            <motion.button
              className="reading-toc-scrim"
              aria-label="Close table of contents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setTocOpen(false)}
            />
            <motion.div
              className="reading-toc-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <nav className="reading-toc reading-toc--drawer" aria-label="Table of contents">
                <p className="reading-toc-label">Contents</p>
                {renderTocList(() => setTocOpen(false))}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Investment layers (Phase 4) */}
      <HighlightLayer articleId={articleId} initial={initialHighlights} />
      <ReactionLayer articleId={articleId} initial={initialReactions} />

      {/* Auto-resume */}
      <AnimatePresence>
        {showResume && (
          <motion.div
            className="reading-resume"
            initial={{ y: 60, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 60, opacity: 0, x: '-50%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <button
              className="reading-resume-main"
              onClick={() => {
                scrollToFraction(savedFraction);
                setResumeDismissed(true);
              }}
            >
              Continue where you left off
              <span aria-hidden> →</span>
              <span className="reading-resume-pct">{Math.round(savedFraction * 100)}%</span>
            </button>
            <button
              className="reading-resume-dismiss"
              onClick={() => setResumeDismissed(true)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
