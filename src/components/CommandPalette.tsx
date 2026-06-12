'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Command } from 'cmdk';
import {
  Search,
  FilePlus2,
  LibraryBig,
  SunMoon,
  FileText,
  BookOpen,
  Highlighter,
  BarChart3,
} from 'lucide-react';
import { getInProgressReads } from '@/lib/reading/progress-store';

interface FileItem {
  id: string;
  title: string;
  minutes?: number;
}

interface ResumeItem {
  id: string;
  title: string;
  pct: number;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [resume, setResume] = useState<ResumeItem | null>(null);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lazily load the user's files whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch('/api/files')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FileItem[]) => {
        if (!active) return;
        setFiles(data);
        // Most recent unfinished read that still exists in the library.
        const candidate = getInProgressReads().find((r) => data.some((f) => f.id === r.id));
        setResume(
          candidate
            ? {
                id: candidate.id,
                title: data.find((f) => f.id === candidate.id)?.title ?? '',
                pct: Math.round(candidate.fraction * 100),
              }
            : null
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Command menu"
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input
            autoFocus
            placeholder="Type a command or search files…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          {resume && (
            <Command.Group
              heading="Continue reading"
              className="px-1 py-1 text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Item
                value={`continue ${resume.title}`}
                onSelect={() => run(() => router.push(`/read/${resume.id}`))}
                icon={BookOpen}
              >
                {resume.title} · {resume.pct}% read
              </Item>
            </Command.Group>
          )}

          <Command.Group
            heading="Actions"
            className="px-1 py-1 text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            <Item onSelect={() => run(() => router.push('/'))} icon={FilePlus2}>
              New / open editor
            </Item>
            <Item onSelect={() => run(() => router.push('/library'))} icon={LibraryBig}>
              Go to Library
            </Item>
            <Item onSelect={() => run(() => router.push('/highlights'))} icon={Highlighter}>
              My highlights
            </Item>
            <Item onSelect={() => run(() => router.push('/stats'))} icon={BarChart3}>
              Reading stats
            </Item>
            <Item
              onSelect={() =>
                run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))
              }
              icon={SunMoon}
            >
              Toggle theme
            </Item>
          </Command.Group>

          {files.length > 0 && (
            <Command.Group
              heading="Read"
              className="px-1 py-1 text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {files.map((file) => (
                <Item
                  key={file.id}
                  value={`read ${file.title}`}
                  onSelect={() => run(() => router.push(`/read/${file.id}`))}
                  icon={FileText}
                >
                  {file.title}
                  {file.minutes ? ` · ${file.minutes} min` : ''}
                </Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  children,
  onSelect,
  icon: Icon,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: typeof FileText;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </Command.Item>
  );
}
