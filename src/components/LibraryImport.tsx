'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_CONTENT_BYTES, MAX_TITLE_LENGTH } from '@/lib/validation';
import { parseFrontmatter } from '@/lib/frontmatter';

interface LibraryImportProps {
  /** Called after at least one file was imported successfully. */
  onImported: () => void;
}

interface ImportSummary {
  ok: number;
  failed: { name: string; reason: string }[];
}

const ACCEPTED = /\.(md|markdown)$/i;

/** Title = first `# Heading` if present, else the file name. */
function deriveTitle(fileName: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const fallback = fileName.replace(/\.(md|markdown)$/i, '').trim();
  return (heading || fallback || 'Untitled').slice(0, MAX_TITLE_LENGTH);
}

/**
 * Multi-file markdown import for the library: an "Import" button plus a
 * page-wide drop target (drag .md files anywhere onto the page).
 */
export default function LibraryImport({ onImported }: LibraryImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const importFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0 || busy) return;

    setBusy(true);
    setSummary(null);
    const result: ImportSummary = { ok: 0, failed: [] };

    // Duplicate guard: skip files whose title is already in the library
    // (and dedupe within the batch itself).
    const existingTitles = new Set<string>();
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        for (const f of (await res.json()) as { title: string }[]) {
          existingTitles.add(f.title.trim().toLowerCase());
        }
      }
    } catch {
      /* no list, no dedupe — imports still proceed */
    }

    for (const file of files) {
      if (!ACCEPTED.test(file.name)) {
        result.failed.push({ name: file.name, reason: 'not a .md file' });
        continue;
      }
      if (file.size > MAX_CONTENT_BYTES) {
        result.failed.push({ name: file.name, reason: 'larger than 256 KB' });
        continue;
      }
      try {
        const raw = await file.text();
        // Frontmatter wins for title/tags and is stripped from the stored body.
        const { title: fmTitle, tags, body: content } = parseFrontmatter(raw);
        if (!content.trim()) {
          result.failed.push({ name: file.name, reason: 'empty file' });
          continue;
        }
        const title = fmTitle?.slice(0, MAX_TITLE_LENGTH) || deriveTitle(file.name, content);
        if (existingTitles.has(title.trim().toLowerCase())) {
          result.failed.push({ name: file.name, reason: 'already in library' });
          continue;
        }
        existingTitles.add(title.trim().toLowerCase());
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags }),
        });
        if (res.ok) {
          result.ok++;
        } else if (res.status === 429) {
          result.failed.push({ name: file.name, reason: 'rate limit reached — try again shortly' });
          break; // No point hammering the limiter with the rest.
        } else {
          result.failed.push({ name: file.name, reason: 'save failed' });
        }
      } catch {
        result.failed.push({ name: file.name, reason: 'could not read file' });
      }
    }

    setBusy(false);
    setSummary(result);
    if (result.ok > 0) onImported();
  }, [busy, onImported]);

  // Page-wide drop target. Depth counter survives child enter/leave churn.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current++;
      setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer) importFiles(e.dataTransfer.files);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [importFiles]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown"
        multiple
        className="hidden"
        aria-label="Import markdown files"
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files);
          e.target.value = ''; // allow re-importing the same selection
        }}
      />
      <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
        Import .md
      </Button>

      {summary && (
        <p className="text-meta text-muted-foreground" role="status">
          {summary.ok > 0 && (
            <span className="font-medium text-primary">
              {summary.ok} imported{summary.failed.length > 0 ? ', ' : ''}
            </span>
          )}
          {summary.failed.length > 0 && (
            <span className="text-destructive" title={summary.failed.map((f) => `${f.name}: ${f.reason}`).join('\n')}>
              {summary.failed.length} skipped ({summary.failed[0].reason}
              {summary.failed.length > 1 ? ', …' : ''})
            </span>
          )}
        </p>
      )}

      {/* Full-page drop overlay */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-scrim backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 text-center shadow-2xl">
              <UploadCloud className="size-8 text-primary" />
              <p className="font-medium text-foreground">Drop your .md files to import</p>
              <p className="text-sm text-muted-foreground">They&rsquo;ll be added straight to your library</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
