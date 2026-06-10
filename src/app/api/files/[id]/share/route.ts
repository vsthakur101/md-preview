import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { enforceWriteLimit } from '@/lib/ratelimit';

type RouteParams = { params: Promise<{ id: string }> };

// POST — enable sharing: mint a shareId for the owner's file (idempotent).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;

    const file = await prisma.markdownFile.findFirst({
      where: { id, userId: session.user.id },
      select: { shareId: true },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    let shareId = file.shareId;
    if (!shareId) {
      shareId = randomUUID().replace(/-/g, '');
      await prisma.markdownFile.update({ where: { id }, data: { shareId } });
    }

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error('Failed to enable sharing:', error);
    return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 });
  }
}

// DELETE — disable sharing: clear the shareId (revokes the public link).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id },
      data: { shareId: null },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disable sharing:', error);
    return NextResponse.json({ error: 'Failed to disable sharing' }, { status: 500 });
  }
}
