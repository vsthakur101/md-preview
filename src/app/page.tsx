'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownPreview from '@/components/MarkdownPreview';

export default function Home() {
  const [markdown, setMarkdown] = useState('');

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
            <div className="w-64">
              <FileUpload onFileContent={handleFileContent} />
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
