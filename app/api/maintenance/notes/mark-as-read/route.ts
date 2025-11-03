import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getEncryptionKey, decrypt, encrypt } from '@/lib/maintenance-crypto';
import { MaintenanceNote } from '@/types/maintenance-note';

const logDir = path.join(process.cwd(), 'logs', 'maintenance');

export async function POST(request: Request) {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey) {
      return NextResponse.json({ message: 'Encryption key is not set up on the server.' }, { status: 500 });
    }

    const { noteIds } = await request.json();
    if (!noteIds || !Array.isArray(noteIds)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const logFiles = await fs.readdir(logDir);
    for (const logFile of logFiles) {
      if (!logFile.endsWith('.notes.log')) continue;

      const logFilePath = path.join(logDir, logFile);
      const fileContent = await fs.readFile(logFilePath, 'utf-8');
      const encryptedLogs = fileContent.trim().split('\n');
      const updatedLogs: string[] = [];
      let madeChanges = false;

      for (const encryptedLog of encryptedLogs) {
        if (!encryptedLog) continue;
        const decryptedLog = decrypt(encryptedLog, encryptionKey);
        if (decryptedLog) {
          const note: MaintenanceNote = JSON.parse(decryptedLog);
          if (noteIds.includes(note.id)) {
            note.isRead = true;
            updatedLogs.push(encrypt(JSON.stringify(note), encryptionKey));
            madeChanges = true;
          } else {
            updatedLogs.push(encryptedLog);
          }
        }
      }

      if (madeChanges) {
        await fs.writeFile(logFilePath, updatedLogs.join('\n') + '\n');
      }
    }

    return NextResponse.json({ message: 'Notes marked as read successfully.' });
  } catch (error) {
    console.error('Failed to mark notes as read:', error);
    return NextResponse.json({ message: 'Failed to mark notes as read.' }, { status: 500 });
  }
}