'use client';

import { useState } from 'react';
import { Save, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeTags, MAX_TAG_LENGTH } from '@/lib/validation';

interface SaveButtonProps {
  content: string;
  onSaved?: () => void;
}

export default function SaveButton({ content, onSaved }: SaveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');

  const handleSave = () => {
    if (!content.trim()) {
      alert('Please write some markdown content first');
      return;
    }
    setShowForm(true);
  };

  const addTag = () => {
    const next = normalizeTags([...tags, tagDraft]);
    setTagDraft('');
    setTags(next);
  };

  const handleConfirmSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, tags }),
      });
      if (!response.ok) throw new Error('Failed to save');

      setShowSuccess(true);
      setShowForm(false);
      setTitle('');
      setTags([]);
      setTagDraft('');
      onSaved?.();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setTitle('');
    setTags([]);
    setTagDraft('');
  };

  return (
    <div className="relative">
      {showForm && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
          <p className="mb-2 text-sm font-medium">Save to library</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title…"
          className="h-9"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirmSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-meta text-foreground"
              >
                {tag}
                <button
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Input
          value={tagDraft}
          maxLength={MAX_TAG_LENGTH}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag, press Enter…"
          className="mt-2 h-8 text-sm"
          aria-label="Add tag"
        />

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isLoading || !content.trim()}
        className={showSuccess ? 'bg-(--cat-fitness) hover:bg-(--cat-fitness) text-primary-foreground' : ''}
      >
        {showSuccess ? (
          <>
            <Check className="size-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="size-4" />
            <span className="hidden sm:inline">Save to Library</span>
            <span className="sm:hidden">Save</span>
          </>
        )}
      </Button>
    </div>
  );
}
