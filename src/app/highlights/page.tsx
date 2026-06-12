import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Highlighter, BookOpen } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import CopyButton from '@/components/CopyButton';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface FileGroup {
  fileId: string;
  title: string;
  highlights: { id: string; text: string; color: string; createdAt: Date }[];
}

export default async function HighlightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/highlights');

  const highlights = await prisma.highlight.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      text: true,
      color: true,
      createdAt: true,
      file: { select: { id: true, title: true } },
    },
  });

  // Group by article, articles ordered by their most recent highlight.
  const groups: FileGroup[] = [];
  const byFile = new Map<string, FileGroup>();
  for (const h of highlights) {
    let group = byFile.get(h.file.id);
    if (!group) {
      group = { fileId: h.file.id, title: h.file.title, highlights: [] };
      byFile.set(h.file.id, group);
      groups.push(group);
    }
    group.highlights.push({ id: h.id, text: h.text, color: h.color, createdAt: h.createdAt });
  }

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
                <Highlighter className="size-5" />
              </div>
              <h1 className="text-lg font-semibold sm:text-xl">Highlights</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-8">
            <p className="text-sm text-muted-foreground">
              {highlights.length} highlight{highlights.length === 1 ? '' : 's'} across{' '}
              {groups.length} article{groups.length === 1 ? '' : 's'}
            </p>
            {groups.map((group) => (
              <section key={group.fileId} className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="min-w-0 truncate font-medium">{group.title}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyButton
                      text={group.highlights.map((h) => `> ${h.text}`).join('\n\n')}
                      label="Copy all"
                    />
                    <Button asChild size="sm" variant="ghost" className="text-primary">
                      <Link href={`/read/${group.fileId}`}>
                        <BookOpen className="size-3.5" />
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {group.highlights.map((h) => (
                    <li key={h.id} className="group flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`highlight-dot highlight-dot-${h.color} mt-1.5 size-3 shrink-0 rounded-sm`}
                      />
                      <blockquote className="min-w-0 flex-1 font-serif italic leading-relaxed text-secondary-foreground">
                        {h.text}
                      </blockquote>
                      <CopyButton
                        text={h.text}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
        <Highlighter className="size-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-medium">No highlights yet</h2>
      <p className="mb-4 max-w-sm text-muted-foreground">
        Select any passage while reading to highlight it. Everything you save shows up here.
      </p>
      <Button asChild>
        <Link href="/library">
          <BookOpen className="size-4" />
          Go read something
        </Link>
      </Button>
    </div>
  );
}
