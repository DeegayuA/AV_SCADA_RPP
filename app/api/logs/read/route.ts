import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogEntry } from '@/lib/activityLog';

const SYSTEM_LOG_FILE = path.resolve(process.cwd(), 'system.log.json');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'error.log.json');

async function readLogFile(filePath: string): Promise<ActivityLogEntry[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as ActivityLogEntry[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File doesn't exist, return empty array
    }
    console.error(`Error reading log file ${filePath}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    const systemLogs = await readLogFile(SYSTEM_LOG_FILE);
    const errorLogs = await readLogFile(ERROR_LOG_FILE);

    const allLogs = [...systemLogs, ...errorLogs];
    // Sort logs by timestamp, most recent first
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allLogs);
  } catch (error) {
    console.error('Error reading log files:', error);
    return NextResponse.json({ message: 'Failed to read logs' }, { status: 500 });
  }
}
