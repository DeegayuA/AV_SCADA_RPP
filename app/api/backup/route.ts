import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cleanupBackups } from '@/lib/cleanup';

export async function POST(request: Request) {
  try {
    const backupData = await request.json();

    const username = backupData.createdBy?.replace(/\s+/g, '_') || 'system';
    const localTime = backupData.localTime || new Date().toISOString().replace(/:/g, '-');

    let prefix = 'backup_';
    if (backupData.backupType === 'manual') {
      prefix = 'manual_backup_';
    } else if (backupData.createdBy === 'auto-backup') {
      prefix = 'auto_backup_';
    }

    const filename = `${prefix}${localTime}_${username}.json`;

    const backupsDir = path.join(process.cwd(), 'backups');

    // Ensure the backups directory exists
    try {
      await fs.mkdir(backupsDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    const filePath = path.join(backupsDir, filename);
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    // Run cleanup in the background, don't wait for it to finish
    cleanupBackups().catch(err => {
      console.error("Backup cleanup process failed:", err);
    });

    return NextResponse.json({ message: 'Backup created successfully', filename }, { status: 201 });
  } catch (error) {
    console.error('Failed to create backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create backup', error: errorMessage }, { status: 500 });
  }
}
