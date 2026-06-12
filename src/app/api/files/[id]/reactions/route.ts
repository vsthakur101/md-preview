import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type RouteParams = { params: Promise<{ id: string }> };

const TYPES = new Set(['heart', 'idea']);

function ownedFile(id: string, userId: string) {
  return prisma.markdownFile.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  });
}

// GET — list the signed-in user's reactions for this file.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const reactions = await prisma.reaction.findMany({
    where: { fileId: id, userId: session.user.id },
    select: { paragraph: true, type: true },
  });
  return NextResponse.json(reactions);
}

// POST — toggle a paragraph reaction. Returns { active }.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!(await ownedFile(id, session.user.id))) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { paragraph, type } = body ?? {};
    if (typeof paragraph !== 'number' || paragraph < 0 || !TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    const key = {
      fileId_userId_paragraph_type: {
        fileId: id,
        userId: session.user.id,
        paragraph,
        type,
      },
    };

    const existing = await prisma.reaction.findUnique({ where: key });
    if (existing) {
      await prisma.reaction.delete({ where: key });
      return NextResponse.json({ active: false });
    }
    await prisma.reaction.create({
      data: { fileId: id, userId: session.user.id, paragraph, type },
    });
    return NextResponse.json({ active: true });
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
