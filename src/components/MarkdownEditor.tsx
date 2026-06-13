'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  ListTree,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listItemAction } from '@/lib/editor/list-continuation';
import { linkifyPastedUrl } from '@/lib/editor/smart-paste';
import { toggleWrap, applyHeadingAtCursor } from '@/lib/editor/markdown-format';
import { parseOutline } from '@/lib/editor/outline';

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
  const [outlineOpen, setOutlineOpen] = useState(false);
  const outline = useMemo(() => parseOutline(value), [value]);

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

  /** Toggle an inline marker (`**`, `*`, `` ` ``) around the selection. */
  const wrap = (marker: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const r = toggleWrap(value, s, e, marker);
    applyEdit(r.text, r.selStart, r.selEnd);
  };

  /** Set or toggle the heading level of the current line (no stacking). */
  const heading = (level: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const r = applyHeadingAtCursor(value, ta.selectionStart, level);
    applyEdit(r.text, r.selStart, r.selEnd);
  };

  /** Move the caret to a heading and scroll it near the top of the pane. */
  const jumpToHeading = (offset: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(offset, offset);
    const lineIndex = value.slice(0, offset).split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, lineIndex * lineHeight - lineHeight * 2);
    setOutlineOpen(false);
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

  // Smart paste: bare URL over a selection → markdown link.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: el } = ta;
    if (s === el) return;
    const link = linkifyPastedUrl(e.clipboardData.getData('text'), value.slice(s, el));
    if (!link) return;
    e.preventDefault();
    const next = value.slice(0, s) + link + value.slice(el);
    applyEdit(next, s + link.length, s + link.length);
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
        return heading(1);
      case 'h2':
        return heading(2);
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

        {/* Outline / jump-to-heading */}
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${outlineOpen ? 'text-foreground' : 'text-muted-foreground'}`}
            title="Outline"
            aria-label="Document outline"
            aria-expanded={outlineOpen}
            disabled={outline.length === 0}
            onClick={() => setOutlineOpen((v) => !v)}
          >
            <ListTree className="size-4" />
          </Button>
          {outlineOpen && outline.length > 0 && (
            <div className="absolute right-0 top-9 z-20 max-h-80 w-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
              {outline.map((item, i) => (
                <button
                  key={`${item.offset}-${i}`}
                  type="button"
                  onClick={() => jumpToHeading(item.offset)}
                  className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  style={{ paddingLeft: `${0.5 + (item.level - 1) * 0.75}rem` }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        id="md-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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
