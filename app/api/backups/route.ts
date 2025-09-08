import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    const files = await fs.readdir(backupsDir);

    const backupDetails = await Promise.all(
      files
        .filter(file => file.endsWith('.json') && /^(manual_backup_|auto_backup_|backup_)/.test(file))
        .map(async (file) => {
          try {
            const filePath = path.join(backupsDir, file);
            const stats = await fs.stat(filePath);
            return {
              filename: file,
              createdAt: stats.birthtime.toISOString(),
              size: stats.size,
            };
          } catch (statError) {
            console.error(`Failed to get stats for file ${file}:`, statError);
            return null;
          }
        })
    );

    const validBackups = backupDetails
      .filter((b): b is { filename: string; createdAt: string; size: number } => b !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups: validBackups });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ backups: [] });
    }
    console.error('Failed to list backups:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to list backups', error: errorMessage }, { status: 500 });
  }
}
