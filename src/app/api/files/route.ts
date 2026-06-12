import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { fileInputSchema, buildPreview, estimateReadMinutes } from '@/lib/validation';
import { enforceWriteLimit } from '@/lib/ratelimit';

/**
 * Context snippet around the first content match, markdown punctuation
 * stripped — shown on library cards in place of the generic preview.
 */
function buildSnippet(content: string, q: string): string | null {
  const idx = content.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + q.length + 90);
  const raw = content
    .slice(start, end)
    .replace(/[#*`>\[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return (start > 0 ? '…' : '') + raw + (end < content.length ? '…' : '');
}

// GET all files belonging to the signed-in user. Optional `?q=` searches
// title AND full article content (case-insensitive).
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 200) ?? '';

    const files = await prisma.markdownFile.findMany({
      where: {
        userId: session.user.id,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        preview: true,
        createdAt: true,
        content: true,
        pinned: true,
        tags: true,
        // The caller's server-synced reading position (cross-device resume).
        progress: {
          where: { userId: session.user.id },
          select: { fraction: true, updatedAt: true },
        },
      },
    });

    // Derive read time server-side; the content itself stays out of the payload.
    return NextResponse.json(
      files.map(({ content, progress, ...file }) => ({
        ...file,
        minutes: estimateReadMinutes(content),
        serverFraction: progress[0]?.fraction ?? 0,
        serverReadAt: progress[0]?.updatedAt ?? null,
        snippet: q ? buildSnippet(content, q) : null,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST new file owned by the signed-in user
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const parsed = fileInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, tags } = parsed.data;

    const file = await prisma.markdownFile.create({
      data: {
        title,
        content,
        preview: buildPreview(content),
        tags: tags ?? [],
        userId: session.user.id,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Failed to create file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
