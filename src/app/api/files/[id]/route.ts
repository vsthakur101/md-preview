import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { fileInputSchema, buildPreview } from '@/lib/validation';
import { enforceWriteLimit } from '@/lib/ratelimit';

type RouteParams = { params: Promise<{ id: string }> };

// GET single file (only if it belongs to the signed-in user)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const file = await prisma.markdownFile.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('Failed to fetch file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

// PATCH file (only if it belongs to the signed-in user)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;
    const parsed = fileInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content } = parsed.data;

    // Scope the update to the owner so a user can never modify another user's
    // file by guessing its id. `updateMany` returns a count instead of throwing
    // when no row matches the (id, userId) pair.
    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id, deletedAt: null },
      data: { title, content, preview: buildPreview(content) },
    });

    if (count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = await prisma.markdownFile.findFirst({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error('Failed to update file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

// DELETE file — soft delete (only if it belongs to the signed-in user).
// The row survives for 30 days (restorable via /restore), then GET purges it.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const { id } = await params;

    // `?force=1` permanently purges — but only rows already in the trash, so
    // a single request can never skip the soft-delete safety net.
    if (request.nextUrl.searchParams.get('force') === '1') {
      const { count } = await prisma.markdownFile.deleteMany({
        where: { id, userId: session.user.id, deletedAt: { not: null } },
      });
      if (count === 0) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, restorable: false });
    }

    // Scope the delete to the owner so a user can never delete another
    // user's file by guessing its id. Also revoke any public share link —
    // a "deleted" file must stop being reachable immediately.
    const { count } = await prisma.markdownFile.updateMany({
      where: { id, userId: session.user.id, deletedAt: null },
      data: { deletedAt: new Date(), shareId: null },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, restorable: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
