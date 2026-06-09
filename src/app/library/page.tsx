'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, FileText, Plus, LibraryBig } from 'lucide-react';
import FileCard from '@/components/FileCard';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MarkdownFile {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
}

type SortKey = 'newest' | 'oldest' | 'title';

export default function LibraryPage() {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      setFiles(await response.json());
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? files.filter(
          (f) =>
            f.title.toLowerCase().includes(q) || f.preview.toLowerCase().includes(q)
        )
      : files;

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'newest' ? diff : -diff;
    });
    return sorted;
  }, [files, query, sort]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="icon" title="Back to Editor">
              <Link href="/">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-pink-600 text-white">
                <LibraryBig className="size-5" />
              </div>
              <h1 className="text-lg font-semibold sm:text-xl">Library</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="pl-9"
              aria-label="Search files"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {visibleFiles.length} {visibleFiles.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-4 text-destructive">{error}</p>
            <Button onClick={fetchFiles}>Try Again</Button>
          </div>
        ) : files.length === 0 ? (
          <EmptyState />
        ) : visibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No files match <span className="font-medium text-foreground">“{query}”</span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleFiles.map((file) => (
              <FileCard
                key={file.id}
                id={file.id}
                title={file.title}
                preview={file.preview}
                createdAt={file.createdAt}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
        <FileText className="size-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-medium">No files yet</h2>
      <p className="mb-4 max-w-sm text-muted-foreground">
        Start by creating a markdown file and saving it to your library.
      </p>
      <Button asChild>
        <Link href="/">
          <Plus className="size-4" />
          Create New File
        </Link>
      </Button>
    </div>
  );
}
