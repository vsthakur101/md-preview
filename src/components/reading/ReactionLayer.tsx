'use client';

import { useEffect, useRef, useState } from 'react';

type RType = 'heart' | 'idea';

export interface InitialReaction {
  paragraph: number;
  type: string;
}

interface Props {
  articleId: string;
  initial: InitialReaction[];
}

const topLevelParagraphs = (): HTMLElement[] => {
  const el = document.getElementById('article');
  if (!el) return [];
  return Array.from(el.children).filter((c) => c.tagName === 'P') as HTMLElement[];
};

export default function ReactionLayer({ articleId, initial }: Props) {
  const reacted = useRef<Map<number, Set<RType>>>(new Map());
  const [hover, setHover] = useState<{ pidx: number; x: number; y: number } | null>(null);
  const [, force] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncAttrs = () => {
    topLevelParagraphs().forEach((p, i) => {
      const set = reacted.current.get(i);
      if (set?.has('heart')) p.dataset.reactHeart = 'true';
      else delete p.dataset.reactHeart;
      if (set?.has('idea')) p.dataset.reactIdea = 'true';
      else delete p.dataset.reactIdea;
    });
  };

  useEffect(() => {
    const el = document.getElementById('article');
    if (!el) return;

    topLevelParagraphs().forEach((p, i) => {
      p.dataset.pidx = String(i);
    });
    for (const r of initial) {
      const set = reacted.current.get(r.paragraph) ?? new Set<RType>();
      set.add(r.type as RType);
      reacted.current.set(r.paragraph, set);
    }
    syncAttrs();

    const onOver = (e: Event) => {
      const p = (e.target as HTMLElement).closest?.('p') as HTMLElement | null;
      if (p && p.parentElement?.id === 'article' && p.dataset.pidx) {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        const rect = p.getBoundingClientRect();
        setHover({
          pidx: Number(p.dataset.pidx),
          x: Math.min(rect.right + 12, window.innerWidth - 44),
          y: rect.top + 2,
        });
      }
    };
    const onLeave = () => {
      hideTimer.current = setTimeout(() => setHover(null), 300);
    };
    el.addEventListener('mouseover', onOver);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseover', onOver);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [initial]);

  const toggle = async (pidx: number, type: RType) => {
    const set = reacted.current.get(pidx) ?? new Set<RType>();
    const had = set.has(type);
    if (had) set.delete(type);
    else set.add(type);
    reacted.current.set(pidx, set);
    syncAttrs();
    force((n) => n + 1);

    try {
      const res = await fetch(`/api/files/${articleId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: pidx, type }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // Revert optimistic change on failure.
      if (had) set.add(type);
      else set.delete(type);
      syncAttrs();
      force((n) => n + 1);
    }
  };

  if (!hover) return null;
  const activeSet = reacted.current.get(hover.pidx);

  return (
    <div
      className="reading-react"
      style={{ position: 'fixed', left: hover.x, top: hover.y }}
      onMouseEnter={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        hideTimer.current = setTimeout(() => setHover(null), 200);
      }}
    >
      <button
        className={`reading-react-btn${activeSet?.has('heart') ? ' is-active' : ''}`}
        onClick={() => toggle(hover.pidx, 'heart')}
        aria-label="React with heart"
      >
        ❤️
      </button>
      <button
        className={`reading-react-btn${activeSet?.has('idea') ? ' is-active' : ''}`}
        onClick={() => toggle(hover.pidx, 'idea')}
        aria-label="React with idea"
      >
        💡
      </button>
    </div>
  );
}
