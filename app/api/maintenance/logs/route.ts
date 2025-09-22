import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getEncryptionKey, decrypt } from '@/lib/maintenance-crypto';

const logDir = path.join(process.cwd(), 'logs', 'maintenance');

export async function GET() {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey) {
      return NextResponse.json({ message: 'Encryption key is not set up on the server.' }, { status: 500 });
    }

    const logFiles = await fs.readdir(logDir);
    const allLogs = [];

    for (const logFile of logFiles) {
      if (path.extname(logFile) === '.log') {
        const logFilePath = path.join(logDir, logFile);
        const fileContent = await fs.readFile(logFilePath, 'utf-8');
        const encryptedLogs = fileContent.trim().split('\n');

        for (const encryptedLog of encryptedLogs) {
          if (encryptedLog) {
            const decryptedLog = decrypt(encryptedLog, encryptionKey);
            if (decryptedLog) {
              allLogs.push(JSON.parse(decryptedLog));
            }
          }
        }
      }
    }

    // Sort logs by timestamp in descending order
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(allLogs);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json([]);
    }
    console.error('Failed to read logs:', error);
    return NextResponse.json({ message: 'Failed to read logs.' }, { status: 500 });
  }
}
