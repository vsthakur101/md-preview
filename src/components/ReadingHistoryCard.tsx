'use client';

import { useState } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import { getReadingHistory, getDailyGoal } from '@/lib/reading/progress-store';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

/**
 * Last 14 days of reading minutes as a bar chart (device-local, like the
 * streak and goal). Bars that hit the daily goal fill in the brand color.
 */
export default function ReadingHistoryCard() {
  const [history] = useState(() => getReadingHistory());
  const [goal] = useState(() => getDailyGoal());
  const mounted = useMounted();

  const days = mounted ? history : [];
  const max = Math.max(goal, ...days.map((d) => d.minutes), 1);
  const total = days.reduce((n, d) => n + d.minutes, 0);

  return (
    <div className="rounded-xl border bg-card p-5 sm:col-span-2">
      <div className="flex items-baseline justify-between">
        <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">
          Last 14 days
        </p>
        <p className="text-meta tabular-nums text-muted-foreground">
          {total}m total{goal > 0 ? ` · goal ${goal}m/day` : ''}
        </p>
      </div>

      {days.length === 0 || total === 0 ? (
        <p className="mt-3 text-meta text-muted-foreground">
          Reading minutes will chart here as you read.
        </p>
      ) : (
        <div className="mt-3 flex h-20 items-end gap-1.5" role="img" aria-label="Daily reading minutes, last 14 days">
          {days.map((d) => {
            const met = goal > 0 && d.minutes >= goal;
            return (
              <div
                key={d.date}
                className="group relative flex h-full flex-1 items-end"
                title={`${dayLabel(d.date)} ${d.date.slice(5)}: ${d.minutes}m${met ? ' · goal hit' : ''}`}
              >
                <div
                  className={`w-full rounded-t-sm transition-colors ${
                    met ? 'bg-primary' : d.minutes > 0 ? 'bg-primary/45' : 'bg-muted'
                  }`}
                  style={{ height: `${Math.max(4, (d.minutes / max) * 100)}%` }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
