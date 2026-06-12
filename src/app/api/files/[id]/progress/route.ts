import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type RouteParams = { params: Promise<{ id: string }> };

const progressSchema = z.object({
  fraction: z.number().min(0).max(1),
});

/**
 * Upsert the caller's reading position for a file (cross-device resume).
 *
 * Deliberately not behind `enforceWriteLimit`: the reader pings this every
 * ~15s while scrolling and it must not drain the shared write budget. Abuse
 * surface is one bounded row per (file, user).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = progressSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Owner-only, same scope as the reader route.
    const file = await prisma.markdownFile.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { fraction } = parsed.data;
    await prisma.readingProgress.upsert({
      where: { fileId_userId: { fileId: id, userId: session.user.id } },
      create: { fileId: id, userId: session.user.id, fraction },
      update: { fraction },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to save progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
