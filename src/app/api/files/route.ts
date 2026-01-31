import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all files
export async function GET() {
  try {
    const files = await prisma.markdownFile.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        preview: true,
        createdAt: true,
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST new file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Create preview from content (first 150 chars, strip markdown)
    const preview = content
      .replace(/[#*`\[\]()>-]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 150);

    const file = await prisma.markdownFile.create({
      data: {
        title,
        content,
        preview: preview + (content.length > 150 ? '...' : ''),
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
