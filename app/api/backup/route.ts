import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const backupData = await request.json();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `backup-${timestamp}.json`;
    const backupsDir = path.join(process.cwd(), 'backups');

    // Ensure the backups directory exists
    try {
      await fs.mkdir(backupsDir, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    const filePath = path.join(backupsDir, filename);
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    return NextResponse.json({ message: 'Backup created successfully', filename }, { status: 201 });
  } catch (error) {
    console.error('Failed to create backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create backup', error: errorMessage }, { status: 500 });
  }
}
