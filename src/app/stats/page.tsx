import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BarChart3, BookOpen, Highlighter } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { estimateReadMinutes } from '@/lib/validation';
import StreakCard from '@/components/StreakCard';
import GoalCard from '@/components/GoalCard';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/stats');
  const userId = session.user.id;

  const [files, highlightCount, noteCount, reactionCount] = await Promise.all([
    prisma.markdownFile.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        progress: { where: { userId }, select: { fraction: true } },
      },
    }),
    prisma.highlight.count({ where: { userId, file: { deletedAt: null } } }),
    prisma.highlight.count({ where: { userId, note: { not: null }, file: { deletedAt: null } } }),
    prisma.reaction.count({ where: { userId, file: { deletedAt: null } } }),
  ]);

  // Synced positions only — a device that hasn't synced yet isn't counted.
  let totalMinutes = 0;
  let minutesRead = 0;
  let finished = 0;
  let inProgress = 0;
  for (const f of files) {
    const minutes = estimateReadMinutes(f.content);
    const fraction = f.progress[0]?.fraction ?? 0;
    totalMinutes += minutes;
    minutesRead += Math.round(minutes * fraction);
    if (fraction >= 0.97) finished++;
    else if (fraction > 0.03) inProgress++;
  }

  const stats: { label: string; value: string; hint: string }[] = [
    {
      label: 'Articles',
      value: String(files.length),
      hint: `${formatMinutes(totalMinutes)} of reading in your library`,
    },
    {
      label: 'Time read',
      value: formatMinutes(minutesRead),
      hint: 'Across synced devices',
    },
    {
      label: 'Finished',
      value: String(finished),
      hint: inProgress > 0 ? `${inProgress} in progress` : 'Nothing in progress',
    },
    {
      label: 'Highlights',
      value: String(highlightCount),
      hint:
        noteCount > 0
          ? `${noteCount} with notes · ${reactionCount} reactions`
          : `${reactionCount} reactions`,
    },
  ];

  return (
    <div className="min-h-screen bg-warm-radial text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-275 items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="icon" title="Back to Library">
              <Link href="/library">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BarChart3 className="size-5" />
              </div>
              <h1 className="text-lg font-semibold sm:text-xl">Reading stats</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StreakCard />
          <GoalCard />
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-5">
              <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="mt-1 text-meta text-muted-foreground">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/library">
              <BookOpen className="size-4" />
              Back to reading
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/highlights">
              <Highlighter className="size-4" />
              My highlights
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
