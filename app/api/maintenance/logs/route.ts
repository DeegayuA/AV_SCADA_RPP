import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getEncryptionKey, decrypt } from '@/lib/maintenance-crypto';

const logDir = path.join(process.cwd(), 'logs', 'maintenance');

export async function GET() {
  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    return NextResponse.json({ message: 'Encryption key is not set up on the server.' }, { status: 500 });
  }

  let logFiles;
  try {
    logFiles = await fs.readdir(logDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read log directory:', error);
    return NextResponse.json({ message: 'Failed to read log directory.' }, { status: 500 });
  }

  const allLogs = [];
  for (const logFile of logFiles) {
    if (path.extname(logFile) !== '.log') continue;

    const logFilePath = path.join(logDir, logFile);
    try {
      const fileContent = await fs.readFile(logFilePath, 'utf-8');
      const encryptedLogs = fileContent.trim().split('\n');

      for (const encryptedLog of encryptedLogs) {
        if (!encryptedLog) continue;
        try {
          const decryptedLog = decrypt(encryptedLog, encryptionKey);
          if (decryptedLog) {
            allLogs.push(JSON.parse(decryptedLog));
          }
        } catch (e) {
          console.error(`Failed to parse decrypted log from ${logFile}:`, e);
          // Skip this log entry
        }
      }
    } catch (error) {
      console.error(`Failed to read or process log file ${logFile}:`, error);
      // Skip this file
    }
  }

  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(allLogs);
}
