'use client';

import { useState } from 'react';
import { useMounted } from '@/hooks/use-mounted';
import { getStats } from '@/lib/reading/progress-store';

/**
 * Day-streak stat from localStorage (device-local by design — finishing is
 * detected client-side). Read once on the client, gated until mounted.
 */
export default function StreakCard() {
  const [stats] = useState(() => getStats());
  const mounted = useMounted();
  const streak = mounted ? stats.streak : 0;

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">
        Streak
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : '—'}
      </p>
      <p className="mt-1 text-meta text-muted-foreground">
        {streak > 0 ? 'Finish an article today to keep it alive' : 'Finish an article to start one'}
      </p>
    </div>
  );
}
