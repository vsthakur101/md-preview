'use client';

import { useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveButtonProps {
  content: string;
  onSaved?: () => void;
}

export default function SaveButton({ content, onSaved }: SaveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [title, setTitle] = useState('');

  const handleSave = () => {
    if (!content.trim()) {
      alert('Please write some markdown content first');
      return;
    }
    setShowTitleInput(true);
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
        body: JSON.stringify({ title: title.trim(), content }),
      });
      if (!response.ok) throw new Error('Failed to save');

      setShowSuccess(true);
      setShowTitleInput(false);
      setTitle('');
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
    setShowTitleInput(false);
    setTitle('');
  };

  if (showTitleInput) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title…"
          className="h-9 w-40 sm:w-48"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirmSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button size="sm" onClick={handleConfirmSave} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSave}
      disabled={isLoading || !content.trim()}
      variant={showSuccess ? 'default' : 'default'}
      className={showSuccess ? 'bg-green-600 hover:bg-green-600 text-white' : ''}
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
  );
}
