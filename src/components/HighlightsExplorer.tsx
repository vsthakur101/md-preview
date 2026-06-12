'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Download } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadTextFile } from '@/lib/export-markdown';

export interface ExplorerGroup {
  fileId: string;
  title: string;
  highlights: { id: string; text: string; color: string; note: string | null }[];
}

const COLORS = ['yellow', 'green', 'blue'] as const;

const asMarkdown = (groups: ExplorerGroup[]) =>
  `# Highlights\n\n` +
  groups
    .map(
      (g) =>
        `## ${g.title}\n\n` +
        g.highlights
          .map((h) => (h.note ? `> ${h.text}\n>\n> — ${h.note}` : `> ${h.text}`))
          .join('\n\n')
    )
    .join('\n\n');

/** Client-side search + color filtering over the server-grouped highlights. */
export default function HighlightsExplorer({ groups }: { groups: ExplorerGroup[] }) {
  const [query, setQuery] = useState('');
  const [color, setColor] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        highlights: g.highlights.filter(
          (h) =>
            (!color || h.color === color) &&
            (!q ||
              h.text.toLowerCase().includes(q) ||
              h.note?.toLowerCase().includes(q) ||
              g.title.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.highlights.length > 0);
  }, [groups, query, color]);

  const total = visible.reduce((n, g) => n + g.highlights.length, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search highlights and notes…"
            className="pl-9"
            aria-label="Search highlights"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" aria-label="Filter by color">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-pressed={color === c}
                title={`${c} highlights`}
                onClick={() => setColor(color === c ? null : c)}
                className={`highlight-dot-${c} size-5 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-foreground/60' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadTextFile('highlights.md', asMarkdown(visible))}
            disabled={total === 0}
          >
            <Download className="size-3.5" />
            Export {query.trim() || color ? 'filtered' : 'all'}
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No highlights match the current filters.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} highlight{total === 1 ? '' : 's'} across {visible.length} article
            {visible.length === 1 ? '' : 's'}
          </p>
          {visible.map((group) => (
            <section key={group.fileId} className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate font-medium">{group.title}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyButton
                    text={group.highlights
                      .map((h) => (h.note ? `> ${h.text}\n>\n> — ${h.note}` : `> ${h.text}`))
                      .join('\n\n')}
                    label="Copy all"
                  />
                  <Button asChild size="sm" variant="ghost" className="text-primary">
                    <Link href={`/read/${group.fileId}`}>
                      <BookOpen className="size-3.5" />
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {group.highlights.map((h) => (
                  <li key={h.id} className="group flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`highlight-dot highlight-dot-${h.color} mt-1.5 size-3 shrink-0 rounded-sm`}
                    />
                    <div className="min-w-0 flex-1">
                      <blockquote className="font-serif italic leading-relaxed text-secondary-foreground">
                        {h.text}
                      </blockquote>
                      {h.note && (
                        <p className="mt-1.5 border-l-2 border-primary/40 pl-2.5 text-sm text-muted-foreground">
                          {h.note}
                        </p>
                      )}
                    </div>
                    <CopyButton
                      text={h.text}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
