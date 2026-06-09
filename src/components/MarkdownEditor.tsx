'use client';

import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Link2,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const PLACEHOLDER = `# Welcome to Markdown Preview

Start typing your markdown here or upload a .md file above.

## Features

- **Bold** and *italic* text
- Lists and checkboxes
- Code blocks with syntax highlighting
- Tables and more!

> Tip: select text and press Cmd/Ctrl+B, +I, or +K.
`;

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Selection to restore after a controlled value update from a toolbar action.
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const { start, end } = pendingSelection.current;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  }, [value]);

  const applyEdit = (next: string, selStart: number, selEnd: number) => {
    pendingSelection.current = { start: selStart, end: selEnd };
    onChange(next);
  };

  /** Wrap the current selection with `before`/`after` (e.g. **bold**). */
  const wrap = (before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    const start = s + before.length;
    applyEdit(next, start, start + selected.length);
  };

  /** Prefix each line spanning the selection (e.g. "# ", "- ", "> "). */
  const prefixLines = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const block = value.slice(lineStart, e);
    const replaced = block
      .split('\n')
      .map((line) => prefix + line)
      .join('\n');
    const next = value.slice(0, lineStart) + replaced + value.slice(e);
    applyEdit(next, lineStart, lineStart + replaced.length);
  };

  /** Insert a markdown link around the selection, cursor landing in the URL. */
  const insertLink = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const text = value.slice(s, e) || 'text';
    const snippet = `[${text}](url)`;
    const next = value.slice(0, s) + snippet + value.slice(e);
    const urlStart = s + text.length + 3; // after "](" ... position of "url"
    applyEdit(next, urlStart, urlStart + 3);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrap('**');
    } else if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrap('*');
    } else if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertLink();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: el } = ta;
      const next = value.slice(0, s) + '  ' + value.slice(el);
      applyEdit(next, s + 2, s + 2);
    }
  };

  type ToolId =
    | 'bold'
    | 'italic'
    | 'link'
    | 'code'
    | 'h1'
    | 'h2'
    | 'ul'
    | 'ol'
    | 'quote';

  const runTool = (id: ToolId) => {
    switch (id) {
      case 'bold':
        return wrap('**');
      case 'italic':
        return wrap('*');
      case 'link':
        return insertLink();
      case 'code':
        return wrap('`');
      case 'h1':
        return prefixLines('# ');
      case 'h2':
        return prefixLines('## ');
      case 'ul':
        return prefixLines('- ');
      case 'ol':
        return prefixLines('1. ');
      case 'quote':
        return prefixLines('> ');
    }
  };

  const tools: { icon: typeof Bold; label: string; id: ToolId }[] = [
    { icon: Bold, label: 'Bold (Cmd/Ctrl+B)', id: 'bold' },
    { icon: Italic, label: 'Italic (Cmd/Ctrl+I)', id: 'italic' },
    { icon: Link2, label: 'Link (Cmd/Ctrl+K)', id: 'link' },
    { icon: Code, label: 'Inline code', id: 'code' },
    { icon: Heading1, label: 'Heading 1', id: 'h1' },
    { icon: Heading2, label: 'Heading 2', id: 'h2' },
    { icon: List, label: 'Bullet list', id: 'ul' },
    { icon: ListOrdered, label: 'Numbered list', id: 'ol' },
    { icon: Quote, label: 'Quote', id: 'quote' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {tools.map(({ icon: Icon, label, id }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              title={label}
              aria-label={label}
              onClick={() => runTool(id)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <span className="shrink-0 pr-2 text-xs text-muted-foreground tabular-nums">
          {value.length} chars
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        className="scrollbar-thin flex-1 w-full resize-none bg-background p-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none sm:p-4"
        spellCheck={false}
      />
    </div>
  );
}
