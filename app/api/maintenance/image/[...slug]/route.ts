import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return new NextResponse('Invalid image path', { status: 400 });
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', 'maintenance_image_preview', ...slug);

    // Sanitize the path to prevent directory traversal
    const publicDir = path.resolve(process.cwd(), 'public', 'maintenance_image_preview');
    const resolvedImagePath = path.resolve(imagePath);

    if (!resolvedImagePath.startsWith(publicDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const imageBuffer = await fs.readFile(resolvedImagePath);

    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return new NextResponse('Image not found', { status: 404 });
    }
    console.error('Failed to serve image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}