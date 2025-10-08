import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogEntry } from '@/lib/activityLog';

const SYSTEM_LOG_FILE = path.resolve(process.cwd(), 'system.log.json');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'error.log.json');

async function appendToLog(filePath: string, entry: ActivityLogEntry) {
  let logs: ActivityLogEntry[] = [];
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    try {
      logs = JSON.parse(data);
      if (!Array.isArray(logs)) {
        throw new SyntaxError("Log file content is not an array.");
      }
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        console.error(`Log file ${filePath} is corrupted. Backing it up and creating a new one.`);
        const backupPath = `${filePath}.corrupted-${Date.now()}`;
        try {
          await fs.rename(filePath, backupPath);
        } catch (renameError) {
          console.error(`Could not rename corrupted log file ${filePath}:`, renameError);
        }
        // Start with a fresh log array
        logs = [];
      } else {
        // Re-throw other parsing errors
        throw parseError;
      }
    }
  } catch (readError: any) {
    // If the file doesn't exist, it's not an error. `logs` is already `[]`.
    if (readError.code !== 'ENOENT') {
      console.error(`Failed to read log file ${filePath}:`, readError);
      // If we can't read the file for unexpected reasons, don't proceed.
      return;
    }
  }

  logs.push(entry);

  try {
    // Write the updated logs back to the file
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
  } catch (writeError) {
    console.error(`Failed to write to log file ${filePath}:`, writeError);
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
