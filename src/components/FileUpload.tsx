'use client';

import { useCallback, useState } from 'react';
import { UploadCloud, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileContent: (content: string) => void;
  /**
   * `panel` renders as the editor pane's full-height empty state (the pane IS
   * the dropzone); `compact` is the small inline box.
   */
  variant?: 'compact' | 'panel';
  /** Shown in the panel variant: dismiss the dropzone and start typing. */
  onStartWriting?: () => void;
}

export default function FileUpload({ onFileContent, variant = 'compact', onStartWriting }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
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
    },
    [onFileContent]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  if (variant === 'panel') {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex h-full flex-col items-center justify-center gap-3 p-8 text-center transition-colors',
          isDragging ? 'bg-primary/5' : 'bg-transparent'
        )}
      >
        <input
          type="file"
          accept=".md"
          onChange={handleInputChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Upload a markdown file"
        />
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-full border-2 border-dashed transition-colors',
            isDragging ? 'border-primary text-primary' : 'border-border text-muted-foreground'
          )}
        >
          <UploadCloud className="size-6" />
        </div>
        <div>
          <p className="font-medium text-foreground">Drop your .md file here</p>
          <p className="mt-1 text-sm text-muted-foreground">or click anywhere in this panel to browse</p>
        </div>
        {onStartWriting && (
          <Button
            variant="outline"
            size="sm"
            className="relative z-10 mt-2"
            onClick={(e) => {
              e.preventDefault();
              onStartWriting();
            }}
          >
            <PenLine className="size-4" />
            Start writing instead
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative cursor-pointer rounded-lg border-2 border-dashed p-3 text-center transition-all duration-200 ease-in-out sm:rounded-xl sm:p-6',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-ring/50'
      )}
    >
      <input
        type="file"
        accept=".md"
        onChange={handleInputChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Upload a markdown file"
      />
      <div className="flex items-center gap-2 sm:flex-col">
        <UploadCloud
          className={cn('size-5 shrink-0 sm:size-8', isDragging ? 'text-primary' : 'text-muted-foreground')}
        />
        <p className="text-left text-xs text-muted-foreground sm:text-center sm:text-sm">
          <span className="font-medium text-foreground">
            <span className="hidden sm:inline">Drop your .md file here or </span>
            <span className="sm:hidden">Upload </span>
            click to browse
          </span>
        </p>
      </div>
    </div>
  );
}
