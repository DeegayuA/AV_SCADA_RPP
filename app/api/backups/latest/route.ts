import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const BACKUP_FILE_PATH = path.join(process.cwd(), 'backups', 'backup.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(BACKUP_FILE_PATH, 'utf-8');
    const backup = JSON.parse(fileContent);
    return NextResponse.json(backup);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ message: 'No backup file found' }, { status: 404 });
    }
    console.error('Failed to read backup file:', error);
    return NextResponse.json({ message: 'Failed to read backup file' }, { status: 500 });
  }
}
