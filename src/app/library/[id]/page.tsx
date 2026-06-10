'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import MarkdownPreview from '@/components/MarkdownPreview';
import ShareButton from '@/components/ShareButton';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

interface MarkdownFile {
  id: string;
  title: string;
  content: string;
  shareId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FileViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const response = await fetch(`/api/files/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'File not found' : 'Failed to fetch file');
        }
        setFile(await response.json());
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFile();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      router.push('/library');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-medium">{error || 'File not found'}</h2>
        <Button asChild className="mt-4">
          <Link href="/library">Back to Library</Link>
        </Button>
      </div>
    );
  }

  const formattedDate = new Date(file.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 shrink-0 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button asChild variant="ghost" size="icon" title="Back to Library">
                <Link href="/library">
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold sm:text-lg">{file.title}</h1>
                <p className="text-xs text-muted-foreground">Created {formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-11 sm:pl-0">
              <ShareButton fileId={file.id} initialShareId={file.shareId} />
              <Button variant="ghost" size="sm" onClick={() => router.push(`/library/${id}/edit`)}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-1">
                  <span className="px-2 text-xs text-muted-foreground">Delete?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : 'Yes'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-2 sm:p-4">
        <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
          <MarkdownPreview content={file.content} />
        </div>
      </main>
    </div>
  );
}
