'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import { normalizeTags, MAX_TAG_LENGTH } from '@/lib/validation';

interface MarkdownFile {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

export default function FileEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot of the loaded file, for dirty detection.
  const savedSnapshot = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const response = await fetch(`/api/files/${id}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'File not found' : 'Failed to load file');
        }
        const data: MarkdownFile = await response.json();
        setTitle(data.title);
        setContent(data.content);
        setTags(data.tags ?? []);
        savedSnapshot.current = JSON.stringify({
          title: data.title,
          content: data.content,
          tags: data.tags ?? [],
        });
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [id]);

  // Dirty whenever the editable fields drift from the loaded snapshot.
  useEffect(() => {
    if (isLoading) return;
    setIsDirty(JSON.stringify({ title, content, tags }) !== savedSnapshot.current);
  }, [title, content, tags, isLoading]);

  // Warn before leaving with unsaved changes (browser-native dialog).
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const addTag = () => {
    setTags((prev) => normalizeTags([...prev, tagDraft]));
    setTagDraft('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!content.trim()) {
      setError('Please write some content');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, tags }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      router.push(`/library/${id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setIsSaving(false);
    }
  };

  // Cmd/Ctrl+S to save. The handler is kept in a ref (synced in an effect, not
  // during render) so the keydown listener can mount once yet call the latest
  // closure over title/content/tags.
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (error && !isSaving && !title && !content) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h2 className="text-lg font-medium text-foreground mb-2">{error}</h2>
        <Link
          href="/library"
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-brand-hover rounded-lg transition-colors"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/library/${id}`}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              title="Cancel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="flex-1 min-w-0 px-3 py-1.5 text-base sm:text-lg font-semibold bg-transparent text-foreground border border-transparent hover:border-border focus:border-ring rounded-lg focus:outline-none"
            />
            {isDirty && !isSaving && (
              <span className="hidden text-meta text-muted-foreground sm:inline">Unsaved</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              title="Save changes (⌘/Ctrl+S)"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
          {/* Tags row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-11">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-meta text-foreground"
              >
                {tag}
                <button
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              maxLength={MAX_TAG_LENGTH}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={tags.length === 0 ? 'Add tags…' : 'Add tag…'}
              className="h-6 w-28 bg-transparent text-meta text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Add tag"
            />
          </div>
          {error && <p className="mt-2 text-sm text-destructive pl-11">{error}</p>}
        </div>
      </header>

      {/* Split editor / preview */}
      <main className="flex-1 flex overflow-hidden">
        <div className="max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col lg:flex-row gap-2 sm:gap-4">
          <div className="flex-1 min-h-[40vh] lg:min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
          <div className="flex-1 min-h-[40vh] lg:min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
            <MarkdownPreview content={content} />
          </div>
        </div>
      </main>
    </div>
  );
}
