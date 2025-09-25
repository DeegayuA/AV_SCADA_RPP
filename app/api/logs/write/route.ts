import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogEntry } from '@/lib/activityLog';

const SYSTEM_LOG_FILE = path.resolve(process.cwd(), 'system.log.json');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'error.log.json');

async function appendToLog(filePath: string, entry: ActivityLogEntry) {
  let fileHandle;
  try {
    fileHandle = await fs.open(filePath, 'r+');
    const data = await fileHandle.readFile('utf-8');
    const logs: ActivityLogEntry[] = data ? JSON.parse(data) : [];
    logs.push(entry);
    await fileHandle.truncate();
    await fileHandle.write(JSON.stringify(logs, null, 2), 0, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it with the first log
      try {
        await fs.writeFile(filePath, JSON.stringify([entry], null, 2));
      } catch (writeError) {
        console.error(`Error creating log file ${filePath}:`, writeError);
      }
    } else {
      console.error(`Error writing to log file ${filePath}:`, error);
    }
  } finally {
    await fileHandle?.close();
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
