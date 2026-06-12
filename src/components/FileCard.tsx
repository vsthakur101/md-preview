'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Trash2, Loader2, BookOpen, CheckCircle2, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onDelete: (id: string) => void;
  onPinToggle?: (id: string, pinned: boolean) => void;
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

export default function FileCard({
  id,
  title,
  preview,
  createdAt,
  minutes,
  progress = 0,
  finished = false,
  pinned = false,
  onDelete,
  onPinToggle,
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
      className="file-card group relative overflow-hidden rounded-xl border bg-card text-card-foreground"
      style={{ '--cat': color } as React.CSSProperties}
    >
      {/* Category accent strip */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />

      <Link href={`/library/${id}`} className="block p-5 pb-3">
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
          {preview || 'No preview available'}
        </p>
      </Link>

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

      {/* Delete control — always visible on touch, hover-reveal on desktop */}
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
    </motion.div>
  );
}
