import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const { slug } = params;
    if (!slug || slug.length < 2) {
      return NextResponse.json({ message: 'Invalid image path' }, { status: 400 });
    }

    const [date, filename] = slug;
    const imagePath = path.join(process.cwd(), 'logs', 'maintenance_images', date, filename);

    const imageDir = path.join(process.cwd(), 'logs', 'maintenance_images');
    const safeImagePath = path.join(imageDir, date, filename);

    // Basic security check to prevent directory traversal
    if (!path.resolve(safeImagePath).startsWith(path.resolve(imageDir))) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await stat(safeImagePath); // Check if file exists

    const imageBuffer = await readFile(safeImagePath);

    // Determine content type from file extension
    const extension = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    if (extension === '.png') {
      contentType = 'image/png';
    } else if (extension === '.jpg' || extension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (extension === '.gif') {
      contentType = 'image/gif';
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error serving maintenance image:', error);
    return NextResponse.json({ message: 'Image not found' }, { status: 404 });
  }
}