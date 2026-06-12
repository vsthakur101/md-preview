'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';
import { getDailyGoal, setDailyGoal, getTodayReadingMinutes } from '@/lib/reading/progress-store';

/**
 * Daily reading goal (device-local, like the streak). Minutes are credited by
 * the reader as you scroll forward through articles.
 */
export default function GoalCard() {
  const [goal, setGoal] = useState(() => getDailyGoal());
  const [today] = useState(() => getTodayReadingMinutes());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const mounted = useMounted();

  const save = () => {
    const next = parseInt(draft, 10);
    if (Number.isFinite(next) && next >= 0) {
      setDailyGoal(next);
      setGoal(next > 0 ? Math.min(next, 600) : 0);
    }
    setEditing(false);
  };

  const pct = goal > 0 ? Math.min(100, Math.round((today / goal) * 100)) : 0;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">
          Daily goal
        </p>
        {!editing && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground"
            title={goal > 0 ? 'Change goal' : 'Set goal'}
            onClick={() => {
              setDraft(goal > 0 ? String(goal) : '20');
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            type="number"
            min={0}
            max={600}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            aria-label="Daily goal in minutes"
          />
          <span className="text-sm text-muted-foreground">min/day</span>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </div>
      ) : !mounted || goal === 0 ? (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums">—</p>
          <p className="mt-1 text-meta text-muted-foreground">
            Set a daily minutes goal to build the habit
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {today}/{goal}m
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-meta text-muted-foreground">
            {pct >= 100 ? 'Goal hit — nice. 🎉' : `${Math.max(0, goal - today)}m to go today`}
          </p>
        </>
      )}
    </div>
  );
}
