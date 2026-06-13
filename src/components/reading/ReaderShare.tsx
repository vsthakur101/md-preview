'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { downloadMarkdown } from '@/lib/export-markdown';
import { SHARE_EXPIRY_OPTIONS } from '@/lib/share-expiry';

interface ReaderShareProps {
  articleId: string;
  title: string;
  initialShareId: string | null;
}

/**
 * Owner-side share + export menu in the reader chrome: mint/copy/revoke the
 * public /share link, and download the article as .md (frontmatter included).
 */
export default function ReaderShare({ articleId, title, initialShareId }: ReaderShareProps) {
  const [open, setOpen] = useState(false);
  const [shareId, setShareId] = useState(initialShareId);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Guard: this component SSRs as part of the reader chrome.
  const shareUrl =
    shareId && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareId}`
      : null;

  const enableAndCopy = async () => {
    setBusy(true);
    try {
      let id = shareId;
      if (!id) {
        const res = await fetch(`/api/files/${articleId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresInDays: expiryDays }),
        });
        if (!res.ok) throw new Error('share failed');
        id = ((await res.json()) as { shareId: string }).shareId;
        setShareId(id);
      }
      await navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* surfaced by the unchanged button label */
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/files/${articleId}/share`, { method: 'DELETE' });
      if (res.ok) setShareId(null);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const exportFile = async () => {
    try {
      const res = await fetch(`/api/files/${articleId}`);
      if (!res.ok) return;
      const file = (await res.json()) as { title: string; content: string; tags?: string[] };
      downloadMarkdown(file.title, file.tags ?? [], file.content);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="reading-share" ref={rootRef}>
      <button
        className={`reading-icon-btn${shareId ? ' is-active' : ''}${open ? ' is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Share or export"
        aria-expanded={open}
        title={shareId ? 'Shared — manage link' : 'Share / export'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="reading-share-pop"
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {!shareId && (
              <label className="reading-share-expiry">
                Expires
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  disabled={busy}
                >
                  {SHARE_EXPIRY_OPTIONS.map((o) => (
                    <option key={o.days} value={o.days}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="reading-share-opt" onClick={enableAndCopy} disabled={busy}>
              {copied ? 'Link copied ✓' : shareId ? 'Copy public link' : 'Create public link'}
            </button>
            {shareUrl && (
              <p className="reading-share-url" title={shareUrl}>
                {shareUrl.replace(/^https?:\/\//, '')}
              </p>
            )}
            <button className="reading-share-opt" onClick={exportFile}>
              Download .md
            </button>
            {shareId && (
              <button className="reading-share-opt reading-share-revoke" onClick={revoke} disabled={busy}>
                Stop sharing
              </button>
            )}
            <p className="reading-share-hint">
              {shareId
                ? 'Anyone with the link can read this article.'
                : `“${title}” is currently private.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
