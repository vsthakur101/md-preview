import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type RouteParams = { params: Promise<{ id: string }> };

const MAX_HIGHLIGHT_TEXT = 5000;
const MAX_NOTE_LENGTH = 2000;

function ownedFile(id: string, userId: string) {
  return prisma.markdownFile.findFirst({ where: { id, userId }, select: { id: true } });
}

// GET — list the signed-in user's highlights for this file.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const highlights = await prisma.highlight.findMany({
    where: { fileId: id, userId: session.user.id },
    orderBy: { startOff: 'asc' },
  });
  return NextResponse.json(highlights);
}

// POST — create a highlight (anchored by character offsets).
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
    const { startOff, endOff, text, color } = body ?? {};
    if (
      typeof startOff !== 'number' ||
      typeof endOff !== 'number' ||
      endOff <= startOff ||
      typeof text !== 'string' ||
      !text.trim()
    ) {
      return NextResponse.json({ error: 'Invalid highlight' }, { status: 400 });
    }

    const highlight = await prisma.highlight.create({
      data: {
        fileId: id,
        userId: session.user.id,
        startOff,
        endOff,
        text: text.slice(0, MAX_HIGHLIGHT_TEXT),
        color: typeof color === 'string' ? color : 'yellow',
      },
    });
    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    console.error('Failed to create highlight:', error);
    return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 });
  }
}

// PATCH — set or clear the note on one highlight (?hid=). Empty note = clear.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const hid = new URL(request.url).searchParams.get('hid');
  if (!hid) {
    return NextResponse.json({ error: 'Missing hid' }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (typeof body?.note !== 'string') {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
    }
    const note = body.note.trim().slice(0, MAX_NOTE_LENGTH) || null;

    const { count } = await prisma.highlight.updateMany({
      where: { id: hid, fileId: id, userId: session.user.id },
      data: { note },
    });
    if (count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    console.error('Failed to update note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE — remove one highlight by id (?hid=).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const hid = new URL(request.url).searchParams.get('hid');
  if (!hid) {
    return NextResponse.json({ error: 'Missing hid' }, { status: 400 });
  }

  const { count } = await prisma.highlight.deleteMany({
    where: { id: hid, fileId: id, userId: session.user.id },
  });
  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
