'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileCardProps {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  onDelete: (id: string) => void;
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

export default function FileCard({ id, title, preview, createdAt, onDelete }: FileCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const color = categoryColor(title);

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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

      <Link href={`/library/${id}`} className="block p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <FileText className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-foreground">{title}</h3>
            <p className="mt-0.5 text-meta text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {preview || 'No preview available'}
        </p>
      </Link>

      {/* Delete control — always visible on touch, hover-reveal on desktop */}
      <div
        className={cn(
          'absolute right-3 top-3 transition-opacity',
          showConfirm ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
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
        )}
      </div>
    </motion.div>
  );
}
