import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { enforceWriteLimit } from '@/lib/ratelimit';
import { expiryFromDays } from '@/lib/share-expiry';

type RouteParams = { params: Promise<{ id: string }> };

// POST — enable sharing: mint a shareId for the owner's file. Idempotent on the
// id, but always (re)applies the requested expiry so re-sharing can extend or
// clear it. Body: { expiresInDays?: number } (0/absent = never).
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
      where: { id, userId: session.user.id, deletedAt: null },
      select: { shareId: true },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const expiresInDays = typeof body?.expiresInDays === 'number' ? body.expiresInDays : 0;
    const shareExpiresAt = expiryFromDays(expiresInDays);

    const shareId = file.shareId ?? randomUUID().replace(/-/g, '');
    await prisma.markdownFile.update({ where: { id }, data: { shareId, shareExpiresAt } });

    return NextResponse.json({ shareId, shareExpiresAt });
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
      data: { shareId: null, shareExpiresAt: null },
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
