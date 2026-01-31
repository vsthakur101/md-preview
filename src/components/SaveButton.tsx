'use client';

import { useState } from 'react';

interface SaveButtonProps {
  content: string;
  onSaved?: () => void;
}

export default function SaveButton({ content, onSaved }: SaveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [title, setTitle] = useState('');

  const handleSave = async () => {
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

      if (!response.ok) {
        throw new Error('Failed to save');
      }

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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirmSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button
          onClick={handleConfirmSave}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={isLoading || !content.trim()}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
        ${showSuccess
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }
      `}
    >
      {showSuccess ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
            />
          </svg>
          Save to Library
        </>
      )}
    </button>
  );
}
