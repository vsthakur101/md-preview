'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Check, Copy, Link2, Loader2, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareButtonProps {
  fileId: string;
  initialShareId: string | null;
}

export default function ShareButton({ fileId, initialShareId }: ShareButtonProps) {
  const [shareId, setShareId] = useState<string | null>(initialShareId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const url =
    shareId && typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareId}`
      : '';

  const enable = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/files/${fileId}/share`, { method: 'POST' });
      if (!r.ok) throw new Error('failed');
      const data = await r.json();
      setShareId(data.shareId);
    } catch {
      alert('Failed to enable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/files/${fileId}/share`, { method: 'DELETE' });
      if (!r.ok) throw new Error('failed');
      setShareId(null);
    } catch {
      alert('Failed to disable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={shareId ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setOpen((o) => !o)}
      >
        <Share2 className="size-4" />
        <span className="hidden sm:inline">{shareId ? 'Shared' : 'Share'}</span>
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
          {shareId ? (
            <>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Globe className="size-4 text-(--cat-fitness)" /> Public link
              </p>
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={url}
                  className="h-8 text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 shrink-0"
                  onClick={copy}
                  title="Copy link"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Anyone with this link can view the file.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-destructive hover:text-destructive"
                onClick={disable}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Stop sharing
              </Button>
            </>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                <Lock className="size-4" /> Private
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Create a public read-only link anyone can open.
              </p>
              <Button size="sm" className="w-full" onClick={enable} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                Create public link
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
