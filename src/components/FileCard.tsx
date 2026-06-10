'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileCardProps {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

export default function FileCard({ id, title, preview, createdAt, onDelete }: FileCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    <Card className="group relative gap-0 overflow-hidden p-0 transition-all duration-200 hover:border-foreground/20 hover:shadow-md">
      <Link href={`/library/${id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold transition-colors group-hover:text-primary">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-4" />
          </div>
        </div>
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
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
    </Card>
  );
}
