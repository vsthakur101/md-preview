'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, Copy, FileCode2, Printer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportMenuProps {
  /** Raw markdown source (for "Copy markdown"). */
  content: string;
  /** Title used for the exported document / filename. */
  title?: string;
}

/** Read the live, rendered preview HTML (includes syntax-highlight styles). */
function getRenderedHtml(): string {
  if (typeof document === 'undefined') return '';
  return document.getElementById('markdown-preview-content')?.innerHTML ?? '';
}

function buildDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         line-height: 1.7; color: #1a1a1a; max-width: 48rem; margin: 2rem auto; padding: 0 1.25rem; }
  h1, h2, h3 { font-weight: 600; line-height: 1.25; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 0.5rem; overflow: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.6rem; }
  blockquote { border-left: 4px solid #d0d7de; margin: 0; padding-left: 1rem; color: #57606a; }
  img { max-width: 100%; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'markdown-export';

export default function ExportMenu({ content, title = 'Markdown Export' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const disabled = !content.trim();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const flashCopied = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 1500);
  };

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(content);
    flashCopied('md');
  };

  const copyHtml = async () => {
    await navigator.clipboard.writeText(getRenderedHtml());
    flashCopied('html');
  };

  const downloadHtml = () => {
    const blob = new Blob([buildDocument(title, getRenderedHtml())], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(title)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const printPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildDocument(title, getRenderedHtml()));
    win.document.close();
    win.focus();
    // Give the new document a tick to lay out before printing.
    setTimeout(() => win.print(), 250);
    setOpen(false);
  };

  const items = [
    { key: 'md', label: copied === 'md' ? 'Copied!' : 'Copy markdown', icon: copied === 'md' ? Check : Copy, onClick: copyMarkdown, keepOpen: true },
    { key: 'html', label: copied === 'html' ? 'Copied!' : 'Copy HTML', icon: copied === 'html' ? Check : FileCode2, onClick: copyHtml, keepOpen: true },
    { key: 'download', label: 'Download HTML', icon: Download, onClick: downloadHtml },
    { key: 'print', label: 'Print / PDF', icon: Printer, onClick: printPdf },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        title={disabled ? 'Nothing to export yet' : 'Export'}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </Button>

      {open && !disabled && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border bg-popover py-1 text-popover-foreground shadow-lg">
          {items.map(({ key, label, icon: Icon, onClick, keepOpen }) => (
            <button
              key={key}
              onClick={() => {
                onClick();
                if (!keepOpen) setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
