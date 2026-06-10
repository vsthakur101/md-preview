'use client';

import { useEffect, useState } from 'react';
import { getRangeOffsets, applyHighlight, removeHighlight } from '@/lib/reading/highlighting';

export interface InitialHighlight {
  id: string;
  startOff: number;
  endOff: number;
  color: string;
  text: string;
}

interface Props {
  articleId: string;
  initial: InitialHighlight[];
}

interface Selecting {
  x: number;
  y: number;
  start: number;
  end: number;
  text: string;
}

const root = () => document.getElementById('article');

export default function HighlightLayer({ articleId, initial }: Props) {
  const [sel, setSel] = useState<Selecting | null>(null);
  const [removeAt, setRemoveAt] = useState<{ x: number; y: number; id: string } | null>(null);

  // Re-apply saved highlights once the article is in the DOM.
  useEffect(() => {
    const el = root();
    if (!el) return;
    for (const h of initial) applyHighlight(el, h.startOff, h.endOff, h.id, h.color);
  }, [initial]);

  // Show the highlight toolbar when the user finishes a text selection.
  useEffect(() => {
    const onMouseUp = () => {
      const el = root();
      const selection = window.getSelection();
      if (!el || !selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      const offsets = getRangeOffsets(el, range);
      if (!offsets) return;
      const rect = range.getBoundingClientRect();
      setRemoveAt(null);
      setSel({
        x: rect.left + rect.width / 2,
        y: rect.top,
        start: offsets.start,
        end: offsets.end,
        text: selection.toString(),
      });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  // Click an existing highlight to reveal the remove control.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest?.(
        'mark.reading-highlight'
      ) as HTMLElement | null;
      if (mark?.dataset.highlightId) {
        const rect = mark.getBoundingClientRect();
        setSel(null);
        setRemoveAt({ x: rect.left + rect.width / 2, y: rect.top, id: mark.dataset.highlightId });
      } else if (!(e.target as HTMLElement).closest?.('.reading-hl-pop')) {
        setRemoveAt(null);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const createHighlight = async (color = 'yellow') => {
    if (!sel) return;
    const el = root();
    if (!el) return;
    try {
      const res = await fetch(`/api/files/${articleId}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startOff: sel.start, endOff: sel.end, text: sel.text, color }),
      });
      if (res.ok) {
        const h = await res.json();
        applyHighlight(el, sel.start, sel.end, h.id, color);
        window.getSelection()?.removeAllRanges();
      }
    } catch {
      /* ignore */
    }
    setSel(null);
  };

  const deleteHighlight = async () => {
    if (!removeAt) return;
    const el = root();
    try {
      await fetch(`/api/files/${articleId}/highlights?hid=${removeAt.id}`, { method: 'DELETE' });
      if (el) removeHighlight(el, removeAt.id);
    } catch {
      /* ignore */
    }
    setRemoveAt(null);
  };

  return (
    <>
      {sel && (
        <div
          className="reading-hl-pop"
          style={{ position: 'fixed', left: sel.x, top: sel.y - 48, transform: 'translateX(-50%)' }}
          // Keep the text selection alive when interacting with the toolbar.
          onMouseDown={(e) => e.preventDefault()}
        >
          <button className="reading-hl-btn" onClick={() => createHighlight('yellow')}>
            <span className="reading-hl-swatch reading-hl-swatch-yellow" />
            Highlight
          </button>
          <button
            className="reading-hl-dot reading-hl-swatch-green"
            aria-label="Highlight green"
            onClick={() => createHighlight('green')}
          />
          <button
            className="reading-hl-dot reading-hl-swatch-blue"
            aria-label="Highlight blue"
            onClick={() => createHighlight('blue')}
          />
        </div>
      )}

      {removeAt && (
        <div
          className="reading-hl-pop"
          style={{
            position: 'fixed',
            left: removeAt.x,
            top: removeAt.y - 48,
            transform: 'translateX(-50%)',
          }}
        >
          <button className="reading-hl-btn reading-hl-remove" onClick={deleteHighlight}>
            Remove highlight
          </button>
        </div>
      )}
    </>
  );
}
