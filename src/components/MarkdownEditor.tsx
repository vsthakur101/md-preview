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
  Lightbulb,
  ListCollapse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listItemAction } from '@/lib/editor/list-continuation';

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

  /**
   * Insert a fenced directive block (`:::key` / `:::aside`) around the
   * selection, padded with blank lines so it parses as its own block. The
   * body text lands selected so the writer can type over it.
   */
  const insertDirective = (name: 'key' | 'aside') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const body =
      value.slice(s, e) || (name === 'key' ? 'Your key takeaway.' : 'Optional deep-dive detail.');
    const open = name === 'aside' ? ':::aside{label="Deep dive"}' : ':::key';
    // Ensure a blank line before the block unless we're at the very start.
    const needsLeadingBreak = s > 0 && !value.slice(0, s).endsWith('\n\n');
    const lead = s === 0 ? '' : needsLeadingBreak ? '\n\n' : '';
    const snippet = `${lead}${open}\n${body}\n:::\n`;
    const next = value.slice(0, s) + snippet + value.slice(e);
    const bodyStart = s + lead.length + open.length + 1;
    applyEdit(next, bodyStart, bodyStart + body.length);
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

  /**
   * On Enter inside a list/quote item, continue the marker on the next line
   * (incrementing ordered numbers); on an empty item, remove the marker to
   * exit the list. Returns true when it handled the key.
   */
  const continueListItem = (): boolean => {
    const ta = textareaRef.current;
    if (!ta) return false;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s !== e) return false; // active selection: let Enter behave normally

    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const action = listItemAction(value.slice(lineStart, s));
    if (!action) return false;

    if (action.type === 'exit') {
      const next = value.slice(0, lineStart) + value.slice(s);
      applyEdit(next, lineStart, lineStart);
    } else {
      const next = value.slice(0, s) + action.insert + value.slice(s);
      applyEdit(next, s + action.insert.length, s + action.insert.length);
    }
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Enter' && !mod && !e.shiftKey) {
      if (continueListItem()) {
        e.preventDefault();
        return;
      }
    }
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
    | 'quote'
    | 'key'
    | 'aside';

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
      case 'key':
        return insertDirective('key');
      case 'aside':
        return insertDirective('aside');
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

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
    { icon: Lightbulb, label: 'Key takeaway (:::key)', id: 'key' },
    { icon: ListCollapse, label: 'Aside / deep-dive (:::aside)', id: 'aside' },
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
      </div>
      <textarea
        ref={textareaRef}
        id="md-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        className="scrollbar-thin flex-1 w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none sm:p-4"
        spellCheck={false}
      />
      <div className="flex shrink-0 items-center justify-end gap-3 border-t px-3 py-1.5 font-mono text-xs text-muted-foreground tabular-nums">
        <span>{wordCount} words</span>
        <span>{value.length} chars</span>
        {wordCount > 0 && <span>~{readingMinutes} min read</span>}
      </div>
    </div>
  );
}
