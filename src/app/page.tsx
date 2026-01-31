'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import SaveButton from '@/components/SaveButton';

export default function Home() {
  const [markdown, setMarkdown] = useState('');

  // Load content from sessionStorage if coming from library edit
  useEffect(() => {
    const editContent = sessionStorage.getItem('editContent');
    if (editContent) {
      setMarkdown(editContent);
      sessionStorage.removeItem('editContent');
      sessionStorage.removeItem('editTitle');
    }
  }, []);

  const handleFileContent = (content: string) => {
    setMarkdown(content);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Markdown Preview
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-56">
                <FileUpload onFileContent={handleFileContent} />
              </div>
              <SaveButton content={markdown} />
              <Link
                href="/library"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Library
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="flex-1 flex overflow-hidden">
        <div className="max-w-7xl w-full mx-auto p-4 flex gap-4">
          {/* Editor Panel */}
          <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
            <MarkdownEditor value={markdown} onChange={setMarkdown} />
          </div>

          {/* Preview Panel */}
          <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
            <MarkdownPreview content={markdown} />
          </div>
        </div>
      </main>
    </div>
  );
}
