import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { enforceWriteLimit } from '@/lib/ratelimit';
import { tagsSchema } from '@/lib/validation';

type RouteParams = { params: Promise<{ id: string }> };

const bodySchema = z.object({ tags: tagsSchema });

// PATCH — replace a file's tag set (only if it belongs to the signed-in user).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id },
      data: { tags: parsed.data.tags },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tags: parsed.data.tags });
  } catch (error) {
    console.error('Failed to update tags:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}
