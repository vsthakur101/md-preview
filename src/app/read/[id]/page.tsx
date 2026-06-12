import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderArticle } from '@/lib/reading/markdown';
import { estimateReadMinutes } from '@/lib/validation';
import Reader from '@/components/reading/Reader';

export const dynamic = 'force-dynamic';

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/read/${id}`);
  }

  const file = await prisma.markdownFile.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, title: true, content: true, tags: true },
  });
  if (!file) notFound();

  const [{ html, headings, minutes }, highlights, reactions, relatedFiles, progress] = await Promise.all([
    renderArticle(file.content),
    prisma.highlight.findMany({
      where: { fileId: file.id, userId: session.user.id },
      select: { id: true, startOff: true, endOff: true, color: true, text: true, note: true },
      orderBy: { startOff: 'asc' },
    }),
    prisma.reaction.findMany({
      where: { fileId: file.id, userId: session.user.id },
      select: { paragraph: true, type: true },
    }),
    prisma.markdownFile.findMany({
      where: { userId: session.user.id, id: { not: file.id } },
      select: { id: true, title: true, preview: true, content: true, tags: true },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    prisma.readingProgress.findUnique({
      where: { fileId_userId: { fileId: file.id, userId: session.user.id } },
      select: { fraction: true },
    }),
  ]);

  // "Keep reading" picks: most shared tags first, recency as the tiebreaker
  // (the query is already newest-first and sort is stable).
  const tagSet = new Set(file.tags);
  const related = relatedFiles
    .map((f) => ({ f, score: f.tags.filter((t) => tagSet.has(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ f }) => ({
      id: f.id,
      title: f.title,
      hook: f.preview,
      minutes: estimateReadMinutes(f.content),
    }));

  return (
    <Reader
      articleId={file.id}
      title={file.title}
      minutes={minutes}
      headings={headings}
      initialHighlights={highlights}
      initialReactions={reactions}
      related={related}
      initialServerFraction={progress?.fraction ?? 0}
    >
      <article
        id="article"
        className="article"
        // Server-rendered, sanitized markdown (no rehype-raw → raw HTML escaped).
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Reader>
  );
}
