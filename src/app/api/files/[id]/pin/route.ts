import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { enforceWriteLimit } from '@/lib/ratelimit';

type RouteParams = { params: Promise<{ id: string }> };

const pinSchema = z.object({
  pinned: z.boolean(),
});

// PATCH pin/unpin a file (only if it belongs to the signed-in user)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsed = pinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Owner-scoped update; count = 0 means not found (or not theirs).
    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id },
      data: { pinned: parsed.data.pinned },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, pinned: parsed.data.pinned });
  } catch (error) {
    console.error('Failed to update pin:', error);
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 });
  }
}
