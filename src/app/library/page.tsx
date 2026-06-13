'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Loader2, FileText, Plus, LibraryBig, BookOpen, Highlighter, Sparkles, BarChart3, Download } from 'lucide-react';
import FileCard from '@/components/FileCard';
import LibraryImport from '@/components/LibraryImport';
import TrashPanel from '@/components/TrashPanel';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  getInProgressReads,
  getPosition,
  getStats,
  isFinished,
  getDailyGoal,
  getTodayReadingMinutes,
} from '@/lib/reading/progress-store';
import { SAMPLE_TITLE, SAMPLE_CONTENT } from '@/lib/reading/sample-article';

interface MarkdownFile {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  minutes?: number;
  pinned?: boolean;
  tags?: string[];
  /** Server-synced reading position (cross-device). */
  serverFraction?: number;
  serverReadAt?: string | null;
  /** Context around the search match, when ?q= matched content. */
  snippet?: string | null;
}

interface ReadingState {
  progress: Record<string, number>;
  finished: Record<string, boolean>;
  resumeId: string | null;
  streak: number;
  todayMinutes: number;
  goal: number;
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
  // Multiple active tags narrow with AND semantics.
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());

  const toggleTagFilter = (tag: string) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };
  const [creatingSample, setCreatingSample] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const router = useRouter();

  const hasLoadedRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Monotonic id so a slow earlier search can't overwrite a newer one's result.
  const reqSeqRef = useRef(0);

  // "/" focuses search (unless already typing somewhere).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fetchFiles = useCallback(async (background = false) => {
    const seq = ++reqSeqRef.current;
    if (!background) setIsLoading(true);
    setError(null);
    try {
      const q = query.trim();
      // Server-side search covers full article content, not just title/preview.
      const response = await fetch(`/api/files${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data: MarkdownFile[] = await response.json();
      // A newer search/refresh started while this was in flight — drop it.
      if (seq !== reqSeqRef.current) return;
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
      setReading({
        progress,
        finished,
        resumeId,
        streak: getStats().streak,
        todayMinutes: getTodayReadingMinutes(),
        goal: getDailyGoal(),
      });
    } catch (err) {
      if (seq !== reqSeqRef.current) return; // superseded; let the newer one report
      console.error('Fetch error:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      if (seq === reqSeqRef.current) setIsLoading(false);
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

  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUndo = (ids: string[], label: string) => {
    setUndo({ ids, label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
  };

  // Deletes are soft server-side; offer a 7s undo window.
  const handleDelete = (id: string) => {
    const deleted = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((file) => file.id !== id));
    if (deleted) showUndo([id], deleted.title);
  };

  const handleUndo = async () => {
    if (!undo) return;
    const target = undo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    try {
      for (const id of target.ids) {
        await fetch(`/api/files/${id}/restore`, { method: 'POST' });
      }
      fetchFiles(true);
    } catch (err) {
      console.error('Undo error:', err);
      setError('Could not restore.');
    }
  };

  // Bulk select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkTag('');
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    const deleted: string[] = [];
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
        if (res.ok) deleted.push(id);
        else if (res.status === 429) break; // rate-limited: stop, keep the rest
      } catch {
        /* skip */
      }
    }
    setBulkBusy(false);
    if (deleted.length > 0) {
      setFiles((prev) => prev.filter((f) => !deleted.includes(f.id)));
      showUndo(deleted, `${deleted.length} file${deleted.length === 1 ? '' : 's'}`);
    }
    exitSelectMode();
  };

  const handleBulkTag = async () => {
    const tag = bulkTag.trim().toLowerCase();
    if (!tag || selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    for (const id of selectedIds) {
      const file = files.find((f) => f.id === id);
      if (!file || file.tags?.includes(tag)) continue;
      try {
        await fetch(`/api/files/${id}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: [...(file.tags ?? []), tag] }),
        });
      } catch {
        /* skip */
      }
    }
    setBulkBusy(false);
    exitSelectMode();
    fetchFiles(true);
  };

  const handlePinToggle = (id: string, pinned: boolean) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, pinned } : file)));
  };

  const handleTagsChange = (id: string, tags: string[]) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, tags } : file)));
  };

  // Seed the sample article and drop the user straight into the reader.
  const handleAddSample = async () => {
    setCreatingSample(true);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: SAMPLE_TITLE, content: SAMPLE_CONTENT, tags: ['sample', 'reading'] }),
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

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files) for (const t of f.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [files]);

  const visibleFiles = useMemo(() => {
    // Text matching happens server-side (?q= covers full content); only the
    // reading-state/tag filters and sort remain client concerns.
    let filtered = files;
    if (filter !== 'all') {
      filtered = filtered.filter((f) => readState(f.id) === filter);
    }
    if (tagFilters.size > 0) {
      filtered = filtered.filter((f) => [...tagFilters].every((t) => f.tags?.includes(t)));
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
  }, [files, sort, filter, tagFilters, readState]);

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
            {((reading?.streak ?? 0) > 0 || (reading?.goal ?? 0) > 0) && (
              <span className="order-last ml-auto whitespace-nowrap text-meta font-medium text-muted-foreground">
                {(reading?.streak ?? 0) > 0 && <>🔥 {reading!.streak}-day streak</>}
                {(reading?.streak ?? 0) > 0 && (reading?.goal ?? 0) > 0 && ' · '}
                {(reading?.goal ?? 0) > 0 && (
                  <span className={reading!.todayMinutes >= reading!.goal ? 'text-primary' : undefined}>
                    {reading!.todayMinutes}/{reading!.goal}m today
                  </span>
                )}
              </span>
            )}
            <button
              onClick={() => setTrashOpen((v) => !v)}
              className={`order-last rounded-full px-2.5 py-1.5 text-meta font-medium transition-colors ${
                trashOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Trash
            </button>
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

          {/* Tag filter chips (only when the library has tags) */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter by tag">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  aria-pressed={tagFilters.has(tag)}
                  onClick={() => toggleTagFilter(tag)}
                  className={`rounded-full px-2.5 py-1 text-meta font-medium transition-colors ${
                    tagFilters.has(tag)
                      ? 'bg-accent-muted text-foreground ring-1 ring-primary/50'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {tagFilters.size > 0 && (
                <button
                  onClick={() => setTagFilters(new Set())}
                  className="px-1.5 text-meta text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles and content…  ( / )"
                className="pl-9"
                aria-label="Search files"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={selectMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              >
                {selectMode ? 'Done' : 'Select'}
              </Button>
              <LibraryImport onImported={() => fetchFiles(true)} />
              {files.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  title="Export library as JSON"
                  // Attachment response downloads and leaves the page in place;
                  // a Next <Link> would client-navigate and not trigger it.
                  onClick={() => window.location.assign('/api/files/export')}
                >
                  <Download className="size-4" />
                  Export
                </Button>
              )}
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

        {trashOpen && <TrashPanel onRestored={() => fetchFiles(true)} />}

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
              ) : tagFilters.size > 0 ? (
                <>
                  Nothing tagged{' '}
                  <span className="font-medium text-foreground">
                    {[...tagFilters].map((t) => `#${t}`).join(' + ')}
                  </span>
                  {filter !== 'all' &&
                    ` that is ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}`}
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
                tags={file.tags ?? []}
                snippet={file.snippet ?? null}
                highlightTerm={query}
                allTags={allTags}
                selectMode={selectMode}
                selected={selectedIds.has(file.id)}
                onSelectToggle={handleSelectToggle}
                onDelete={handleDelete}
                onPinToggle={handlePinToggle}
                onTagsChange={handleTagsChange}
                onTagClick={toggleTagFilter}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-full border bg-popover py-2 pl-4 pr-2 text-sm shadow-lg">
          <span className="font-medium tabular-nums">{selectedIds.size} selected</span>
          <Input
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBulkTag()}
            placeholder="Add tag…"
            className="h-8 w-28"
            aria-label="Tag for selected files"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBulkTag}
            disabled={bulkBusy || !bulkTag.trim() || selectedIds.size === 0}
          >
            Tag
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkBusy || selectedIds.size === 0}
          >
            {bulkBusy ? <Loader2 className="size-3.5 animate-spin" /> : `Delete ${selectedIds.size || ''}`}
          </Button>
          <Button size="sm" variant="ghost" onClick={exitSelectMode}>
            Cancel
          </Button>
        </div>
      )}

      {/* Soft-delete undo toast */}
      {!selectMode && undo && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-popover py-2 pl-4 pr-2 text-sm shadow-lg">
          <span className="max-w-56 truncate">
            Deleted <span className="font-medium">{undo.label}</span>
          </span>
          <Button size="sm" variant="secondary" onClick={handleUndo}>
            Undo
          </Button>
        </div>
      )}
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
