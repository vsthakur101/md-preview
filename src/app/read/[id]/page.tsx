import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { renderArticle } from '@/lib/reading/markdown';
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
    select: { id: true, title: true, content: true },
  });
  if (!file) notFound();

  const [{ html, headings, minutes }, highlights, reactions, relatedFiles] = await Promise.all([
    renderArticle(file.content),
    prisma.highlight.findMany({
      where: { fileId: file.id, userId: session.user.id },
      select: { id: true, startOff: true, endOff: true, color: true, text: true },
      orderBy: { startOff: 'asc' },
    }),
    prisma.reaction.findMany({
      where: { fileId: file.id, userId: session.user.id },
      select: { paragraph: true, type: true },
    }),
    prisma.markdownFile.findMany({
      where: { userId: session.user.id, id: { not: file.id } },
      select: { id: true, title: true, preview: true, content: true },
      orderBy: { updatedAt: 'desc' },
      take: 2,
    }),
  ]);

  const estimateMinutes = (content: string) =>
    Math.max(1, Math.round((content.trim() ? content.trim().split(/\s+/).length : 0) / 230));

  const related = relatedFiles.map((f) => ({
    id: f.id,
    title: f.title,
    hook: f.preview,
    minutes: estimateMinutes(f.content),
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
