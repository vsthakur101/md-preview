'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FileCardProps {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

export default function FileCard({ id, title, preview, createdAt, onDelete }: FileCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      onDelete(id);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Card Content */}
      <Link href={`/library/${id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formattedDate}
            </p>
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {preview || 'No preview available'}
        </p>
      </Link>

      {/* Delete Button */}
      <div className="absolute top-3 right-14 opacity-0 group-hover:opacity-100 transition-opacity">
        {showConfirm ? (
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
            >
              {isDeleting ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowConfirm(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
