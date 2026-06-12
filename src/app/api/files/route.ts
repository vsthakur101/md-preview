import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { fileInputSchema, buildPreview, estimateReadMinutes } from '@/lib/validation';
import { enforceWriteLimit } from '@/lib/ratelimit';

// GET all files belonging to the signed-in user
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const files = await prisma.markdownFile.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        preview: true,
        createdAt: true,
        content: true,
        pinned: true,
        // The caller's server-synced reading position (cross-device resume).
        progress: {
          where: { userId: session.user.id },
          select: { fraction: true, updatedAt: true },
        },
      },
    });

    // Derive read time server-side; the content itself stays out of the payload.
    return NextResponse.json(
      files.map(({ content, progress, ...file }) => ({
        ...file,
        minutes: estimateReadMinutes(content),
        serverFraction: progress[0]?.fraction ?? 0,
        serverReadAt: progress[0]?.updatedAt ?? null,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST new file owned by the signed-in user
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limited = await enforceWriteLimit(session.user.id);
  if (limited) return limited;

  try {
    const parsed = fileInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content } = parsed.data;

    const file = await prisma.markdownFile.create({
      data: {
        title,
        content,
        preview: buildPreview(content),
        userId: session.user.id,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error('Failed to create file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
