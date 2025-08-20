import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    // Basic security check to prevent directory traversal
    if (filename.includes('..')) {
      return NextResponse.json({ message: 'Invalid filename' }, { status: 400 });
    }

    const backupsDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupsDir, filename);

    const data = await fs.readFile(filePath, 'utf-8');
    const backupJson = JSON.parse(data);

    return NextResponse.json(backupJson);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: 'Backup not found' }, { status: 404 });
    }
    console.error(`Failed to get backup ${params.filename}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to get backup', error: errorMessage }, { status: 500 });
  }
}
