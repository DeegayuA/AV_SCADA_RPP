import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogEntry } from '@/lib/activityLog';

const SYSTEM_LOG_FILE = path.resolve(process.cwd(), 'system.log.json');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'error.log.json');

async function appendToLog(filePath: string, entry: ActivityLogEntry) {
  try {
    let logs: ActivityLogEntry[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      logs = JSON.parse(data);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      // File doesn't exist, it will be created with the first log
    }
    logs.push(entry);
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error(`Error writing to log file ${filePath}:`, error);
  }
}

export async function POST(request: Request) {
  try {
    const entry = await request.json() as ActivityLogEntry;

    if (!entry || typeof entry.actionType !== 'string') {
      return NextResponse.json({ message: 'Invalid log entry' }, { status: 400 });
    }

    const isErrorLog =
        (entry.details?.severity && ['critical', 'warning'].includes(entry.details.severity)) ||
        entry.actionType.toLowerCase().includes('error') ||
        entry.actionType.toLowerCase().includes('fail');

    if (isErrorLog) {
      await appendToLog(ERROR_LOG_FILE, entry);
    } else {
      await appendToLog(SYSTEM_LOG_FILE, entry);
    }

    return NextResponse.json({ message: 'Log entry saved' });
  } catch (error) {
    console.error('Error processing log entry:', error);
    return NextResponse.json({ message: 'Failed to save log entry' }, { status: 500 });
  }
}
