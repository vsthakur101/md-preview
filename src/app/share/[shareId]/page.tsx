import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import MarkdownPreview from '@/components/MarkdownPreview';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const file = await prisma.markdownFile.findUnique({
    where: { shareId },
    select: { title: true, content: true, updatedAt: true },
  });

  if (!file) notFound();

  const updated = new Date(file.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 shrink-0 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600 text-white">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">{file.title}</h1>
              <p className="text-xs text-muted-foreground">Shared · updated {updated}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/">Open editor</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-2 sm:p-4">
        <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
          <MarkdownPreview content={file.content} />
        </div>
      </main>
    </div>
  );
}
