'use client';

import { useEffect, useRef, useState } from 'react';
import { getRangeOffsets, applyHighlight, removeHighlight } from '@/lib/reading/highlighting';

export interface InitialHighlight {
  id: string;
  startOff: number;
  endOff: number;
  color: string;
  text: string;
  note?: string | null;
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

/** Toggle the noted-marker class on every <mark> belonging to a highlight. */
function setNotedClass(id: string, noted: boolean) {
  document
    .querySelectorAll(`mark[data-highlight-id="${id}"]`)
    .forEach((m) => m.classList.toggle('has-note', noted));
}

export default function HighlightLayer({ articleId, initial }: Props) {
  const [sel, setSel] = useState<Selecting | null>(null);
  const [removeAt, setRemoveAt] = useState<{ x: number; y: number; id: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ id: string; x: number; y: number; draft: string } | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  // id → highlighted text, so the popover can copy without re-reading the DOM.
  const textsRef = useRef(new Map<string, string>());
  // id → note. State (not a ref): the popover label reads it during render.
  const [notes, setNotes] = useState(
    () => new Map(initial.filter((h) => h.note).map((h) => [h.id, h.note as string]))
  );

  // Re-apply saved highlights once the article is in the DOM.
  useEffect(() => {
    const el = root();
    if (!el) return;
    for (const h of initial) {
      textsRef.current.set(h.id, h.text);
      applyHighlight(el, h.startOff, h.endOff, h.id, h.color);
      if (h.note) setNotedClass(h.id, true);
    }
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
        setNoteEdit(null);
        setRemoveAt({ x: rect.left + rect.width / 2, y: rect.top, id: mark.dataset.highlightId });
      } else if (
        !(e.target as HTMLElement).closest?.('.reading-hl-pop') &&
        !(e.target as HTMLElement).closest?.('.reading-note-pop')
      ) {
        setRemoveAt(null);
        setNoteEdit(null);
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
        textsRef.current.set(h.id, sel.text);
        applyHighlight(el, sel.start, sel.end, h.id, color);
        window.getSelection()?.removeAllRanges();
      }
    } catch {
      /* ignore */
    }
    setSel(null);
  };

  const copyHighlight = async () => {
    if (!removeAt) return;
    // Fall back to the live <mark> contents (a highlight can span several marks).
    const text =
      textsRef.current.get(removeAt.id) ??
      Array.from(document.querySelectorAll(`mark[data-highlight-id="${removeAt.id}"]`))
        .map((m) => m.textContent ?? '')
        .join('');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(removeAt.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const openNoteEditor = () => {
    if (!removeAt) return;
    setNoteEdit({
      id: removeAt.id,
      x: removeAt.x,
      y: removeAt.y,
      draft: notes.get(removeAt.id) ?? '',
    });
    setRemoveAt(null);
  };

  const saveNote = async () => {
    if (!noteEdit || noteSaving) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/files/${articleId}/highlights?hid=${noteEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteEdit.draft }),
      });
      if (res.ok) {
        const { note } = (await res.json()) as { note: string | null };
        setNotes((prev) => {
          const next = new Map(prev);
          if (note) next.set(noteEdit.id, note);
          else next.delete(noteEdit.id);
          return next;
        });
        setNotedClass(noteEdit.id, Boolean(note));
        setNoteEdit(null);
      }
    } catch {
      /* ignore */
    } finally {
      setNoteSaving(false);
    }
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
          <button className="reading-hl-btn" onClick={copyHighlight}>
            {copiedId === removeAt.id ? 'Copied ✓' : 'Copy'}
          </button>
          <button className="reading-hl-btn" onClick={openNoteEditor}>
            {notes.has(removeAt.id) ? 'Edit note' : 'Note'}
          </button>
          <button className="reading-hl-btn reading-hl-remove" onClick={deleteHighlight}>
            Remove
          </button>
        </div>
      )}

      {noteEdit && (
        <div
          className="reading-note-pop"
          style={{
            position: 'fixed',
            left: noteEdit.x,
            top: Math.max(64, noteEdit.y - 10),
            transform: 'translate(-50%, -100%)',
          }}
        >
          <textarea
            autoFocus
            rows={3}
            maxLength={2000}
            placeholder="Add a note…"
            value={noteEdit.draft}
            onChange={(e) => setNoteEdit({ ...noteEdit, draft: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
              if (e.key === 'Escape') setNoteEdit(null);
            }}
          />
          <div className="reading-note-actions">
            <button className="reading-note-cancel" onClick={() => setNoteEdit(null)}>
              Cancel
            </button>
            <button className="reading-note-save" onClick={saveNote} disabled={noteSaving}>
              {noteSaving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
