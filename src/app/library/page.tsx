'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Loader2, FileText, Plus, LibraryBig, BookOpen, Highlighter, Sparkles, BarChart3 } from 'lucide-react';
import FileCard from '@/components/FileCard';
import LibraryImport from '@/components/LibraryImport';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getInProgressReads, getPosition, getStats, isFinished } from '@/lib/reading/progress-store';
import { SAMPLE_TITLE, SAMPLE_CONTENT } from '@/lib/reading/sample-article';

interface MarkdownFile {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  minutes?: number;
  pinned?: boolean;
  /** Server-synced reading position (cross-device). */
  serverFraction?: number;
  serverReadAt?: string | null;
}

interface ReadingState {
  progress: Record<string, number>;
  finished: Record<string, boolean>;
  resumeId: string | null;
  streak: number;
}

type SortKey = 'newest' | 'oldest' | 'title';
type FilterKey = 'all' | 'unread' | 'inprogress' | 'finished';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'inprogress', label: 'In progress' },
  { key: 'finished', label: 'Finished' },
];

export default function LibraryPage() {
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [reading, setReading] = useState<ReadingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [creatingSample, setCreatingSample] = useState(false);
  const router = useRouter();

  const hasLoadedRef = useRef(false);

  const fetchFiles = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    setError(null);
    try {
      const q = query.trim();
      // Server-side search covers full article content, not just title/preview.
      const response = await fetch(`/api/files${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data: MarkdownFile[] = await response.json();
      setFiles(data);

      // Merge per-file progress: the furthest of this device's localStorage
      // position and the server-synced one (cross-device). Snapshotted
      // alongside the fetch (post-mount, so there's no SSR/hydration concern).
      const localRecency = new Map(getInProgressReads().map((r) => [r.id, r.at]));
      const progress: Record<string, number> = {};
      const finished: Record<string, boolean> = {};
      let resumeId: string | null = null;
      let resumeAt = -1;
      for (const f of data) {
        const eff = Math.max(getPosition(f.id), f.serverFraction ?? 0);
        progress[f.id] = eff;
        finished[f.id] = isFinished(f.id) || eff >= 0.97;
        if (!finished[f.id] && eff > 0.03 && eff < 0.97) {
          const at = Math.max(
            localRecency.get(f.id) ?? 0,
            f.serverReadAt ? Date.parse(f.serverReadAt) : 0
          );
          if (at > resumeAt) {
            resumeAt = at;
            resumeId = f.id;
          }
        }
      }
      setReading({ progress, finished, resumeId, streak: getStats().streak });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  // Initial load immediately; subsequent searches debounced and in-background.
  useEffect(() => {
    const background = hasLoadedRef.current;
    const timer = setTimeout(() => {
      hasLoadedRef.current = true;
      fetchFiles(background);
    }, background ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchFiles]);

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handlePinToggle = (id: string, pinned: boolean) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, pinned } : file)));
  };

  // Seed the sample article and drop the user straight into the reader.
  const handleAddSample = async () => {
    setCreatingSample(true);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: SAMPLE_TITLE, content: SAMPLE_CONTENT }),
      });
      if (!res.ok) throw new Error('Failed to create sample');
      const file = await res.json();
      router.push(`/read/${file.id}`);
    } catch (err) {
      console.error('Sample article error:', err);
      setCreatingSample(false);
      setError('Could not create the sample article. Please try again.');
    }
  };

  const readState = useCallback(
    (id: string): FilterKey => {
      if (reading?.finished[id]) return 'finished';
      if ((reading?.progress[id] ?? 0) > 0.03) return 'inprogress';
      return 'unread';
    },
    [reading]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { all: files.length, unread: 0, inprogress: 0, finished: 0 };
    for (const f of files) counts[readState(f.id)]++;
    return counts;
  }, [files, readState]);

  const visibleFiles = useMemo(() => {
    // Text matching happens server-side (?q= covers full content); only the
    // reading-state filter and sort remain client concerns.
    let filtered = files;
    if (filter !== 'all') {
      filtered = filtered.filter((f) => readState(f.id) === filter);
    }

    const sorted = [...filtered].sort((a, b) => {
      // Pinned files always lead, regardless of the chosen sort.
      const pinDiff = Number(b.pinned ?? false) - Number(a.pinned ?? false);
      if (pinDiff !== 0) return pinDiff;
      if (sort === 'title') return a.title.localeCompare(b.title);
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'newest' ? diff : -diff;
    });
    return sorted;
  }, [files, sort, filter, readState]);

  return (
    <div className="min-h-screen bg-warm-radial text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-275 items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="icon" title="Back to Editor">
              <Link href="/">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LibraryBig className="size-5" />
              </div>
              <h1 className="text-lg font-semibold sm:text-xl">Library</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="icon" title="Reading stats">
              <Link href="/stats">
                <BarChart3 className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" title="My highlights">
              <Link href="/highlights">
                <Highlighter className="size-5" />
              </Link>
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-275 px-3 py-4 sm:px-4 sm:py-8">
        {/* Jump back in — the zero-friction return path to the last unfinished read */}
        {reading?.resumeId && (
          <ContinueReadingBanner
            file={files.find((f) => f.id === reading.resumeId)!}
            progress={reading.progress[reading.resumeId] ?? 0}
            streak={reading.streak}
          />
        )}

        {/* Toolbar — shares the card surface system so it doesn't float on the canvas */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-3">
          {/* Reading-state filter tabs + streak chip */}
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Filter by reading state">
            {(reading?.streak ?? 0) > 0 && (
              <span className="order-last ml-auto whitespace-nowrap text-meta font-medium text-muted-foreground">
                🔥 {reading!.streak}-day streak
              </span>
            )}
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-meta tabular-nums ${filter === f.key ? 'opacity-80' : 'opacity-60'}`}>
                  {filterCounts[f.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles and content…"
                className="pl-9"
                aria-label="Search files"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LibraryImport onImported={() => fetchFiles(true)} />
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
            <Button onClick={() => fetchFiles()}>Try Again</Button>
          </div>
        ) : files.length === 0 && !query.trim() ? (
          <EmptyState onAddSample={handleAddSample} creatingSample={creatingSample} />
        ) : visibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {query.trim() ? (
                <>
                  No files match <span className="font-medium text-foreground">“{query}”</span>
                </>
              ) : (
                <>
                  Nothing {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} yet
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleFiles.map((file) => (
              <FileCard
                key={file.id}
                id={file.id}
                title={file.title}
                preview={file.preview}
                createdAt={file.createdAt}
                minutes={file.minutes}
                progress={reading?.progress[file.id] ?? 0}
                finished={reading?.finished[file.id] ?? false}
                pinned={file.pinned ?? false}
                onDelete={handleDelete}
                onPinToggle={handlePinToggle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ContinueReadingBanner({
  file,
  progress,
  streak,
}: {
  file: MarkdownFile;
  progress: number;
  streak: number;
}) {
  const pct = Math.round(progress * 100);
  const minutesLeft = file.minutes ? Math.max(1, Math.ceil(file.minutes * (1 - progress))) : null;

  return (
    <Link
      href={`/read/${file.id}`}
      className="group mb-6 flex items-center gap-4 overflow-hidden rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 sm:p-5"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
        <BookOpen className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold uppercase tracking-wide text-primary">
          Jump back in
          {streak > 1 && <span className="ml-2 normal-case text-muted-foreground">🔥 {streak}-day streak</span>}
        </p>
        <p className="truncate font-medium text-foreground">{file.title}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1 max-w-56 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-meta tabular-nums text-muted-foreground">
            {pct}%{minutesLeft ? ` · ${minutesLeft} min left` : ''}
          </span>
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:flex">
        Continue
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

function EmptyState({
  onAddSample,
  creatingSample,
}: {
  onAddSample: () => void;
  creatingSample: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
        <FileText className="size-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-medium">No files yet</h2>
      <p className="mb-4 max-w-sm text-muted-foreground">
        Drop .md files anywhere on this page, create one from scratch — or take the
        reader for a spin first.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAddSample} disabled={creatingSample}>
          {creatingSample ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Try a sample article
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Plus className="size-4" />
            Create New File
          </Link>
        </Button>
      </div>
    </div>
  );
}
