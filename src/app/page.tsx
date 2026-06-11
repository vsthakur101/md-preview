'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, Library, Cloud, FolderOpen } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import SaveButton from '@/components/SaveButton';
import ExportMenu from '@/components/ExportMenu';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';
import { useSyncedScroll } from '@/hooks/use-synced-scroll';

const DRAFT_KEY = 'md-preview:draft';

function readDraft(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function Home() {
  // Lazily restore the draft on the client; gated below by `mounted` so the
  // restored value never causes a hydration mismatch.
  const [markdown, setMarkdown] = useState<string>(readDraft);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Once the user opts to write (or has content), the editor pane stops being
  // the dropzone for the rest of the session.
  const [startedWriting, setStartedWriting] = useState(false);
  const mounted = useMounted();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.endsWith('.md')) {
      alert('Please upload a .md file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setMarkdown((ev.target?.result as string) ?? '');
    reader.readAsText(file);
  };

  // Keep the editor and preview panes scrolled to the same fraction. Only
  // enabled once the textarea is actually rendered (the empty-state dropzone
  // replaces it), so the effect re-attaches when the editor appears.
  const editorVisible = mounted && (startedWriting || markdown.length > 0);
  useSyncedScroll('md-editor-textarea', 'md-preview-scroll', editorVisible);

  // Debounced autosave of the scratch buffer to localStorage.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (markdown) {
          localStorage.setItem(DRAFT_KEY, markdown);
          setSavedAt(Date.now());
        } else {
          localStorage.removeItem(DRAFT_KEY);
          setSavedAt(null);
        }
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [markdown]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setSavedAt(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 shrink-0 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText className="size-5" />
              </div>
              <h1 className="truncate text-lg font-semibold sm:text-xl">Markdown Preview</h1>
              {mounted && savedAt && (
                <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
                  <Cloud className="size-3.5" />
                  Draft saved
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleOpenFile}
                className="hidden"
                aria-label="Open a markdown file"
              />
              <Button
                variant="ghost"
                size="icon"
                title="Open .md file"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="size-5" />
              </Button>
              <ExportMenu content={markdown} />
              <SaveButton content={markdown} onSaved={clearDraft} />
              <Button asChild variant="ghost" size="icon" title="Library">
                <Link href="/library">
                  <Library className="size-5" />
                </Link>
              </Button>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-2 sm:p-4 lg:flex-row">
          <div className="min-h-[40vh] flex-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
            {!mounted ? (
              <div className="h-full animate-pulse bg-muted/30" />
            ) : !markdown && !startedWriting ? (
              // Empty state: the editor pane IS the dropzone.
              <FileUpload
                variant="panel"
                onFileContent={setMarkdown}
                onStartWriting={() => setStartedWriting(true)}
              />
            ) : (
              <MarkdownEditor value={markdown} onChange={setMarkdown} />
            )}
          </div>
          <div className="min-h-[40vh] flex-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
            <MarkdownPreview content={markdown} />
          </div>
        </div>
      </main>
    </div>
  );
}
