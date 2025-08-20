import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    const files = await fs.readdir(backupsDir);
    const backupFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        return {
          filename: file,
          // We could add more metadata here if needed, like creation time from the filename
        };
      })
      .reverse(); // Show newest first

    return NextResponse.json(backupFiles);
  } catch (error) {
    // If the directory doesn't exist, return an empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to list backups:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to list backups', error: errorMessage }, { status: 500 });
  }
}
