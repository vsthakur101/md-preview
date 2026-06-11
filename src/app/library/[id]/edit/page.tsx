'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';

interface MarkdownFile {
  id: string;
  title: string;
  content: string;
}

export default function FileEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [id]);

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
        body: JSON.stringify({ title: title.trim(), content }),
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
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-brand-hover rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
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
