'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tag, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTags } from '@/lib/validation';

interface TagEditorProps {
  fileId: string;
  tags: string[];
  /** Union of tags across the library, for suggestions. */
  allTags: string[];
  onTagsChange: (id: string, tags: string[]) => void;
}

/** Popover tag editor on a library card. Every add/remove persists immediately. */
export default function TagEditor({ fileId, tags, allTags, onTagsChange }: TagEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const persist = async (next: string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${fileId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: next }),
      });
      if (!res.ok) throw new Error('Failed to update tags');
      const data = (await res.json()) as { tags: string[] };
      onTagsChange(fileId, data.tags);
    } catch (error) {
      console.error('Tag update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const next = normalizeTags([...tags, draft]);
    setDraft('');
    if (next.length !== tags.length) persist(next);
  };

  const removeTag = (tag: string) => persist(tags.filter((t) => t !== tag));

  const suggestions = allTags.filter((t) => !tags.includes(t));

  return (
    <div ref={rootRef} className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="size-8 bg-background/80 text-muted-foreground backdrop-blur hover:text-primary"
        title="Edit tags"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Tag className="size-4" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-9 z-20 w-60 rounded-lg border bg-popover p-3 shadow-lg"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-meta font-semibold text-foreground">Tags</p>
              {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </div>

            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-meta text-foreground"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              value={draft}
              maxLength={MAX_TAG_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={tags.length >= MAX_TAGS ? 'Tag limit reached' : 'Add tag…'}
              disabled={tags.length >= MAX_TAGS}
              list={`tag-suggestions-${fileId}`}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
              aria-label="Add tag"
            />
            <datalist id={`tag-suggestions-${fileId}`}>
              {suggestions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="mt-1.5 text-meta text-muted-foreground">Enter to add</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
