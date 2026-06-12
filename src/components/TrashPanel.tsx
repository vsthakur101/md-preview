'use client';

import { useEffect, useState } from 'react';
import { Trash2, Undo2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrashedFile {
  id: string;
  title: string;
  preview: string;
  deletedAt: string;
  daysLeft: number;
}

interface TrashPanelProps {
  /** Called after a restore so the library list can refetch. */
  onRestored: () => void;
}

/** Soft-deleted files: restore or purge. Items vanish on their own after 30 days. */
export default function TrashPanel({ onRestored }: TrashPanelProps) {
  const [items, setItems] = useState<TrashedFile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/files?deleted=1')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TrashedFile[]) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const restore = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/files/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setItems((prev) => prev?.filter((f) => f.id !== id) ?? null);
        onRestored();
      }
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/files/${id}?force=1`, { method: 'DELETE' });
      if (res.ok) setItems((prev) => prev?.filter((f) => f.id !== id) ?? null);
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Trash2 className="size-4 text-muted-foreground" />
        Trash
        <span className="font-normal text-muted-foreground">
          — items are deleted forever after 30 days
        </span>
      </p>

      {items === null ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Trash is empty.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.title}</p>
                <p className="text-meta text-muted-foreground">
                  {f.daysLeft > 0 ? `${f.daysLeft} day${f.daysLeft === 1 ? '' : 's'} left` : 'expiring'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === f.id}
                onClick={() => restore(f.id)}
              >
                <Undo2 className="size-3.5" />
                Restore
              </Button>
              {confirmId === f.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === f.id}
                    onClick={() => purge(f.id)}
                  >
                    {busyId === f.id ? <Loader2 className="size-3.5 animate-spin" /> : 'Forever'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmId(f.id)}
                >
                  Delete forever
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
