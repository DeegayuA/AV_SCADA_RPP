import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SYSTEM_LOG_FILE = path.resolve(process.cwd(), 'system.log.json');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'error.log.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileType = searchParams.get('file');

  let filePath;
  let fileName;

  if (fileType === 'system') {
    filePath = SYSTEM_LOG_FILE;
    fileName = 'system.log.json';
  } else if (fileType === 'error') {
    filePath = ERROR_LOG_FILE;
    fileName = 'error.log.json';
  } else {
    return NextResponse.json({ message: 'Invalid file type specified' }, { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    return new NextResponse(data, { headers });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ message: 'Log file not found' }, { status: 404 });
    }
    console.error(`Error reading log file ${filePath}:`, error);
    return NextResponse.json({ message: 'Failed to read log file' }, { status: 500 });
  }
}
