'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadTextFile } from '@/lib/export-markdown';

interface Props {
  fileName: string;
  text: string;
  label: string;
}

/** Download a server-prebuilt text blob (e.g. the highlights export). */
export default function DownloadTextButton({ fileName, text, label }: Props) {
  return (
    <Button size="sm" variant="outline" onClick={() => downloadTextFile(fileName, text)}>
      <Download className="size-3.5" />
      {label}
    </Button>
  );
}
