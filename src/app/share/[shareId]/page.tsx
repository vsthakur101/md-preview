import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { renderArticle } from '@/lib/reading/markdown';
import { isShareExpired } from '@/lib/share-expiry';
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
    select: { id: true, title: true, content: true, shareExpiresAt: true },
  });
  if (!file) notFound();

  // An expired link 404s for content but shows a friendly explanation.
  if (isShareExpired(file.shareExpiresAt)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-semibold">This link has expired</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The owner shared this article with a time limit that has passed. Ask them for a fresh link.
        </p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Go to md-preview
        </Link>
      </div>
    );
  }

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
