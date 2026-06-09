'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Library, Cloud } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import SaveButton from '@/components/SaveButton';
import ExportMenu from '@/components/ExportMenu';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';

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
  const mounted = useMounted();

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
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600 text-white">
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
              <div className="hidden w-44 sm:block lg:w-52">
                <FileUpload onFileContent={setMarkdown} />
              </div>
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
          {/* Mobile upload row */}
          <div className="mt-3 sm:hidden">
            <FileUpload onFileContent={setMarkdown} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 p-2 sm:gap-4 sm:p-4 lg:flex-row">
          <div className="min-h-[40vh] flex-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
            {mounted ? (
              <MarkdownEditor value={markdown} onChange={setMarkdown} />
            ) : (
              <div className="h-full animate-pulse bg-muted/30" />
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
