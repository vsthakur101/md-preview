'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CopyButton from '@/components/CopyButton';
import { markFinished } from '@/lib/reading/progress-store';

export interface RelatedRead {
  id: string;
  title: string;
  hook: string;
  minutes: number;
}

interface Props {
  articleId: string;
  highlights: { id: string; text: string; color: string; note?: string | null }[];
  related: RelatedRead[];
}

export default function EndMatter({ articleId, highlights, related }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<{ count: number; streak: number } | null>(null);

  // Reaching the end-matter = finishing the article.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStats(markFinished(articleId));
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [articleId]);

  return (
    <section ref={ref} className="reading-endmatter">
      {stats && (
        <div className="reading-finished">
          <span className="reading-finished-check">✓</span>
          You finished this article
          <span className="reading-finished-stats">
            {stats.count} read{stats.count === 1 ? '' : 's'} · 🔥 {stats.streak}-day streak
          </span>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="reading-recap">
          <div className="reading-recap-head">
            <h3 className="reading-endmatter-title">Here&rsquo;s what you saved</h3>
            <div className="reading-recap-actions">
              <CopyButton
                text={highlights
                  .map((h) => (h.note ? `> ${h.text}\n>\n> — ${h.note}` : `> ${h.text}`))
                  .join('\n\n')}
                label="Copy all"
              />
              <Link href="/highlights" className="reading-recap-all">
                All highlights →
              </Link>
            </div>
          </div>
          <ul>
            {highlights.map((h) => (
              <li key={h.id}>
                <span className={`reading-recap-dot reading-highlight-${h.color}`} />
                <span className="reading-recap-body">
                  <span className="reading-recap-text">{h.text}</span>
                  {h.note && <span className="reading-recap-note">{h.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {related.length > 0 && (
        <div className="reading-related">
          <h3 className="reading-endmatter-title">Keep reading</h3>
          <div className="reading-related-grid">
            {related.map((r) => (
              <Link key={r.id} href={`/read/${r.id}`} className="reading-related-card">
                <span className="reading-related-cardtitle">{r.title}</span>
                <span className="reading-related-hook">{r.hook}</span>
                <span className="reading-related-time">{r.minutes} min read</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
