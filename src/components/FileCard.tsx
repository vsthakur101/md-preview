'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Trash2, Loader2, BookOpen, CheckCircle2, Pin, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TagEditor from '@/components/TagEditor';
import { downloadMarkdown } from '@/lib/export-markdown';
import { cn } from '@/lib/utils';

interface FileCardProps {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  minutes?: number;
  /** Merged reading progress 0..1 (max of local and server; 0 = not started). */
  progress?: number;
  finished?: boolean;
  pinned?: boolean;
  tags?: string[];
  /** Context around the search match (replaces the preview when present). */
  snippet?: string | null;
  /** The active search term, for emphasizing matches in the snippet. */
  highlightTerm?: string;
  /** Bulk-select mode: clicking the card toggles selection instead of navigating. */
  selectMode?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  /** Union of tags across the library, for editor suggestions. */
  allTags?: string[];
  onDelete: (id: string) => void;
  onPinToggle?: (id: string, pinned: boolean) => void;
  onTagsChange?: (id: string, tags: string[]) => void;
  onTagClick?: (tag: string) => void;
}

/*
 * Category accent, derived from the title. The 3px strip + tinted icon is what
 * keeps a grid of cards from reading as identical grey boxes. Colors come from
 * the --cat-* design tokens in globals.css — no raw hex here.
 */
const CATEGORIES: { color: string; test: RegExp }[] = [
  { color: 'var(--cat-interview)', test: /faang|interview|system design|leetcode|dsa|behavioral|resume/i },
  { color: 'var(--cat-fitness)', test: /fitness|workout|gym|health|diet|nutrition|running|sleep/i },
  { color: 'var(--cat-ai)', test: /\bai\b|llm|gpt|claude|machine learning|\bml\b|prompt|agent|rag\b/i },
  { color: 'var(--cat-security)', test: /cyber|security|hack|pentest|vulnerab|exploit|threat/i },
  { color: 'var(--cat-dev)', test: /next\.?js|react|typescript|javascript|node|css|frontend|backend|\bapi\b|\bdev\b/i },
];

function categoryColor(title: string): string {
  for (const c of CATEGORIES) {
    if (c.test.test(title)) return c.color;
  }
  return 'var(--cat-neutral)';
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wrap case-insensitive occurrences of `term` in <mark>. */
function emphasize(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(term.trim())})`, 'ig'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-accent-muted px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function FileCard({
  id,
  title,
  preview,
  createdAt,
  minutes,
  progress = 0,
  finished = false,
  pinned = false,
  tags = [],
  snippet = null,
  highlightTerm = '',
  selectMode = false,
  selected = false,
  onSelectToggle,
  allTags = [],
  onDelete,
  onPinToggle,
  onTagsChange,
  onTagClick,
}: FileCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const color = categoryColor(title);
  const inProgress = !finished && progress > 0.03 && progress < 0.97;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/files/${id}`);
      if (!response.ok) throw new Error('Failed to fetch file');
      const file = (await response.json()) as { title: string; content: string; tags?: string[] };
      downloadMarkdown(file.title, file.tags ?? [], file.content);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handlePinToggle = async () => {
    setIsPinning(true);
    try {
      const response = await fetch(`/api/files/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !pinned }),
      });
      if (!response.ok) throw new Error('Failed to update pin');
      onPinToggle?.(id, !pinned);
    } catch (error) {
      console.error('Pin error:', error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      onDelete(id);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'file-card group relative overflow-hidden rounded-xl border bg-card text-card-foreground',
        selectMode && selected && 'border-primary ring-2 ring-primary/40'
      )}
      style={{ '--cat': color } as React.CSSProperties}
    >
      {/* Category accent strip */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />

      {/* Select-mode checkbox */}
      {selectMode && (
        <span
          aria-hidden
          className={cn(
            'absolute right-3 top-3 z-10 flex size-5 items-center justify-center rounded-full border-2',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border-strong bg-background/80'
          )}
        >
          {selected && <CheckCircle2 className="size-4" />}
        </span>
      )}

      <Link
        href={`/library/${id}`}
        className="block p-5 pb-3"
        aria-pressed={selectMode ? selected : undefined}
        onClick={(e) => {
          if (selectMode) {
            e.preventDefault();
            onSelectToggle?.(id);
          }
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-foreground">{title}</h3>
            <p className="mt-0.5 text-meta text-muted-foreground">
              {formattedDate}
              {minutes ? <> · {minutes} min read</> : null}
            </p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {snippet ? emphasize(snippet, highlightTerm) : preview || 'No preview available'}
        </p>
      </Link>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-1">
          {tags.slice(0, 4).map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="rounded-full bg-muted px-2 py-0.5 text-meta text-muted-foreground transition-colors hover:bg-accent-muted hover:text-foreground"
            >
              {tag}
            </button>
          ))}
          {tags.length > 4 && (
            <span className="px-1 py-0.5 text-meta text-muted-foreground">+{tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Reading state: finished badge / in-progress %, plus a direct reader link */}
      <div className="flex items-center justify-between gap-3 px-5 pb-4">
        {finished ? (
          <span className="inline-flex items-center gap-1.5 text-meta font-medium text-primary">
            <CheckCircle2 className="size-3.5" />
            Finished
          </span>
        ) : inProgress ? (
          <span className="text-meta font-medium tabular-nums text-primary">
            {Math.round(progress * 100)}% read
          </span>
        ) : (
          <span aria-hidden />
        )}
        <Link
          href={`/read/${id}`}
          className="inline-flex items-center gap-1.5 text-meta font-medium text-muted-foreground transition-colors hover:text-primary"
          onClick={(e) => {
            if (selectMode) {
              e.preventDefault();
              onSelectToggle?.(id);
            }
          }}
        >
          <BookOpen className="size-3.5" />
          {inProgress ? 'Continue' : finished ? 'Read again' : 'Read'}
        </Link>
      </div>

      {/* In-progress articles wear their position as a hairline along the base. */}
      {inProgress && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Delete control — always visible on touch, hover-reveal on desktop.
          Hidden entirely in select mode (the checkbox owns that corner). */}
      {!selectMode && (
      <div
        className={cn(
          'absolute right-3 top-3 transition-opacity',
          // Pinned cards keep their pin visible; otherwise hover-reveal on desktop.
          showConfirm || pinned ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        )}
      >
        {showConfirm ? (
          <div className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : 'Delete'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 bg-background/80 text-muted-foreground backdrop-blur hover:text-primary"
              title="Download .md"
              onClick={(e) => {
                e.preventDefault();
                handleDownload();
              }}
            >
              <Download className="size-4" />
            </Button>
            {onTagsChange && (
              <TagEditor fileId={id} tags={tags} allTags={allTags} onTagsChange={onTagsChange} />
            )}
            {onPinToggle && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'size-8 bg-background/80 backdrop-blur',
                  pinned ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-primary'
                )}
                title={pinned ? 'Unpin' : 'Pin to top'}
                disabled={isPinning}
                onClick={(e) => {
                  e.preventDefault();
                  handlePinToggle();
                }}
              >
                <Pin className={cn('size-4', pinned && 'fill-current')} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-8 bg-background/80 text-muted-foreground backdrop-blur hover:text-destructive"
              title="Delete"
              onClick={(e) => {
                e.preventDefault();
                setShowConfirm(true);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      )}
    </motion.div>
  );
}
