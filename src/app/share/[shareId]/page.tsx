import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { renderArticle } from '@/lib/reading/markdown';
import Reader from '@/components/reading/Reader';

export const dynamic = 'force-dynamic';

// Share links are unlisted; keep them out of search indexes.
export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Public share link. Renders the full reading experience (typography, progress,
 * TOC, focus mode) in `publicView` mode — no auth, no highlight/reaction layers.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const file = await prisma.markdownFile.findFirst({
    where: { shareId, deletedAt: null },
    select: { id: true, title: true, content: true },
  });
  if (!file) notFound();

  const { html, headings, minutes } = await renderArticle(file.content);

  return (
    <Reader
      articleId={`share:${shareId}`}
      title={file.title}
      minutes={minutes}
      headings={headings}
      initialHighlights={[]}
      initialReactions={[]}
      related={[]}
      publicView
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
