import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { buildLibraryExport } from '@/lib/library-export';

// GET — full-library JSON backup for the signed-in user (excludes trashed files).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const files = await prisma.markdownFile.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true, tags: true, createdAt: true },
    });

    const payload = buildLibraryExport(
      files.map((f) => ({
        title: f.title,
        content: f.content,
        tags: f.tags,
        createdAt: f.createdAt.toISOString(),
      })),
      new Date()
    );

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="md-preview-library.json"',
      },
    });
  } catch (error) {
    console.error('Failed to export library:', error);
    return NextResponse.json({ error: 'Failed to export library' }, { status: 500 });
  }
}
