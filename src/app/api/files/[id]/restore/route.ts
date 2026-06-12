import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { enforceWriteLimit } from '@/lib/ratelimit';

type RouteParams = { params: Promise<{ id: string }> };

// POST — restore a soft-deleted file (undo). Share links are NOT revived;
// delete revoked them deliberately.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to restore file:', error);
    return NextResponse.json({ error: 'Failed to restore file' }, { status: 500 });
  }
}
