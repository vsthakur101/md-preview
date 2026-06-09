import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { fileInputSchema, buildPreview } from '@/lib/validation';

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
      where: { id, userId: session.user.id },
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
      where: { id, userId: session.user.id },
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

// DELETE file (only if it belongs to the signed-in user)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Scope the delete to the owner so a user can never delete another
    // user's file by guessing its id.
    const { count } = await prisma.markdownFile.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
