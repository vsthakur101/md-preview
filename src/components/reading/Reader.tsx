'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import HighlightLayer, { type InitialHighlight } from '@/components/reading/HighlightLayer';
import ReactionLayer, { type InitialReaction } from '@/components/reading/ReactionLayer';
import ReadAloud from '@/components/reading/ReadAloud';
import EndMatter, { type RelatedRead } from '@/components/reading/EndMatter';
import TextSizeControl from '@/components/reading/TextSizeControl';
import ReaderShare from '@/components/reading/ReaderShare';
import ShortcutsHelp from '@/components/reading/ShortcutsHelp';
import { useMounted } from '@/hooks/use-mounted';
import { useTextSize, textSizePx, useReadingTheme } from '@/hooks/use-reading-prefs';
import { getPosition, savePosition, addReadingMinutes } from '@/lib/reading/progress-store';
import type { ArticleHeading } from '@/lib/reading/markdown';

interface ReaderProps {
  articleId: string;
  title: string;
  minutes: number;
  headings: ArticleHeading[];
  initialHighlights: InitialHighlight[];
  initialReactions: InitialReaction[];
  related: RelatedRead[];
  /**
   * Anonymous share-link mode: same typography/progress/TOC experience, but no
   * account-coupled layers (highlights, reactions, end matter) and no back link.
   */
  publicView?: boolean;
  /** Server-synced scroll fraction (cross-device resume); 0 when none. */
  initialServerFraction?: number;
  /** Existing public share id, if the owner already shared this article. */
  initialShareId?: string | null;
  children: React.ReactNode; // server-rendered <article>
}

/** Min interval between server progress syncs while scrolling. */
const SYNC_INTERVAL_MS = 15_000;

export default function Reader({
  articleId,
  title,
  minutes,
  headings,
  initialHighlights,
  initialReactions,
  related,
  publicView = false,
  initialServerFraction = 0,
  initialShareId = null,
  children,
}: ReaderProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [focus, setFocus] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const textSize = useTextSize();
  const readingTheme = useReadingTheme();

  const focusRef = useRef(false);
  const spotRef = useRef<Element | null>(null);

  // Resume: the furthest of this device's position and the server-synced one;
  // read once on the client, gated until mounted (no SSR mismatch).
  const [savedFraction] = useState(() => Math.max(getPosition(articleId), initialServerFraction));
  const mounted = useMounted();
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const activeRef = useRef(-1);
  const chromeRef = useRef(false);
  const lastYRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server progress sync (cross-device resume): throttled while scrolling,
  // flushed on pagehide. Delta gate avoids no-op PUTs.
  const latestFracRef = useRef(0);
  const lastSyncAtRef = useRef(0);
  const lastSentRef = useRef(-1);

  // Daily-goal credit baseline (null until the first save sets it, so a
  // resume jump isn't credited) and the tab-title progress cache.
  const creditFracRef = useRef<number | null>(null);
  const titlePctRef = useRef(-1);

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

    const syncProgress = (frac: number, keepalive = false) => {
      if (publicView || Math.abs(frac - lastSentRef.current) < 0.01) return;
      lastSentRef.current = frac;
      fetch(`/api/files/${articleId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fraction: frac }),
        keepalive,
      }).catch(() => {
        /* offline / transient — localStorage still has the position */
      });
    };

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

      // Mirror progress into the tab title (whole-percent granularity).
      const pct = Math.round(frac * 100);
      if (pct !== titlePctRef.current) {
        titlePctRef.current = pct;
        document.title = pct > 0 && pct < 100 ? `${pct}% · ${title}` : title;
      }

      // Persist resume position + recency (debounced), syncing to the server
      // at most every SYNC_INTERVAL_MS.
      latestFracRef.current = frac;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        savePosition(articleId, frac);

        // Daily-goal credit: small forward deltas only, so TOC jumps and the
        // resume scroll don't count as "minutes read".
        const prev = creditFracRef.current;
        creditFracRef.current = frac;
        if (prev !== null) {
          const delta = frac - prev;
          if (delta > 0 && delta <= 0.15) addReadingMinutes(minutes * delta);
        }

        if (Date.now() - lastSyncAtRef.current >= SYNC_INTERVAL_MS) {
          lastSyncAtRef.current = Date.now();
          syncProgress(frac);
        }
      }, 400);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Final flush when the tab is hidden or closed (keepalive survives unload).
    const onPageHide = () => {
      if (document.visibilityState === 'hidden') syncProgress(latestFracRef.current, true);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onPageHide);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onPageHide);
      if (raf) cancelAnimationFrame(raf);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      document.title = title;
    };
  }, [articleId, headings, minutes, publicView, title]);

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

  // Heading anchors: clicking the "#" copies the section's deep link.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onClick = async (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a.heading-anchor');
      if (!anchor) return;
      e.preventDefault();
      const url = new URL(window.location.href);
      url.hash = anchor.getAttribute('href') ?? '';
      try {
        await navigator.clipboard.writeText(url.toString());
        setLinkCopied(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setLinkCopied(false), 1500);
      } catch {
        /* clipboard unavailable — fall back to plain hash navigation */
        window.location.hash = url.hash;
      }
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Keyboard shortcuts: j/k section nav, f focus, t TOC, ? help, Esc closes.
  useEffect(() => {
    const jumpSection = (delta: 1 | -1) => {
      const next = Math.min(headings.length - 1, Math.max(0, activeRef.current + delta));
      if (next === activeRef.current && delta === -1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const id = headings[next]?.id;
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      switch (e.key) {
        case 'j':
          jumpSection(1);
          break;
        case 'k':
          jumpSection(-1);
          break;
        case 'f':
          toggleFocus();
          break;
        case 't':
          if (headings.length > 1) setTocOpen((v) => !v);
          break;
        case '?':
          setHelpOpen((v) => !v);
          break;
        case 'Escape':
          if (helpOpen) setHelpOpen(false);
          else if (tocOpen) setTocOpen(false);
          else if (focusRef.current) toggleFocus();
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
    <div
      className="reader-root"
      data-focus={focus ? 'on' : 'off'}
      data-reading-theme={readingTheme}
      style={{ '--reading-size': `${textSizePx(textSize)}px` } as React.CSSProperties}
    >
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
        {!publicView && (
          <Link href={`/library/${articleId}`} className="reading-chrome-back" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {headings.length > 1 && (
          <button
            className="reading-icon-btn reading-toc-toggle"
            onClick={() => setTocOpen(true)}
            aria-label="Table of contents"
            title="Contents (t)"
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
        {!publicView && (
          <ReaderShare articleId={articleId} title={title} initialShareId={initialShareId} />
        )}
        <TextSizeControl />
        <button
          className={`reading-icon-btn${focus ? ' is-active' : ''}`}
          onClick={toggleFocus}
          aria-label="Toggle focus mode"
          title="Focus mode (f)"
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
          {!publicView && (
            <EndMatter
              articleId={articleId}
              related={related}
              highlights={initialHighlights.map((h) => ({
                id: h.id,
                text: h.text,
                color: h.color,
                note: h.note ?? null,
              }))}
            />
          )}
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

      {/* Investment layers (Phase 4) — owner only; the APIs are auth-scoped */}
      {!publicView && (
        <>
          <HighlightLayer articleId={articleId} initial={initialHighlights} />
          <ReactionLayer articleId={articleId} initial={initialReactions} />
        </>
      )}

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Heading deep-link confirmation */}
      <AnimatePresence>
        {linkCopied && (
          <motion.div
            className="reading-toast"
            initial={{ y: 16, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 16, opacity: 0, x: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            Link copied
          </motion.div>
        )}
      </AnimatePresence>

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
