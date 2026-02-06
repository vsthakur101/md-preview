'use client';

import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileContent: (content: string) => void;
}

export default function FileUpload({ onFileContent }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.md')) {
      alert('Please upload a .md file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileContent(content);
    };
    reader.readAsText(file);
  }, [onFileContent]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-lg sm:rounded-xl p-3 sm:p-6 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }
      `}
    >
      <input
        type="file"
        accept=".md"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex items-center sm:flex-col gap-2 sm:gap-2">
        <svg
          className={`w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-left sm:text-center">
          <span className="font-medium text-gray-900 dark:text-gray-200">
            <span className="hidden sm:inline">Drop your .md file here or </span>
            <span className="sm:hidden">Upload </span>
            click to browse
          </span>
        </p>
      </div>
    </div>
  );
}
