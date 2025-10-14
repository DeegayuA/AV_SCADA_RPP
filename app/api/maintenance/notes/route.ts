import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { getEncryptionKey, decrypt } from '@/lib/maintenance-crypto';
import { MaintenanceNote } from '@/types/maintenance-note';

const logDir = path.join(process.cwd(), 'logs', 'maintenance');
const IV_LENGTH = 16;

function encrypt(text: string, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function POST(request: Request) {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey) {
      return NextResponse.json({ message: 'Encryption key is not set up on the server.' }, { status: 500 });
    }

    const note: MaintenanceNote = await request.json();
    note.id = crypto.randomUUID();
    note.timestamp = new Date().toISOString();

    await fs.mkdir(logDir, { recursive: true });

    const dateString = format(new Date(note.timestamp), 'yyyy-MM-dd');
    const logFilePath = path.join(logDir, `${dateString}.notes.log`);

    const encryptedLogData = encrypt(JSON.stringify(note), encryptionKey);
    await fs.appendFile(logFilePath, encryptedLogData + '\n');

    return NextResponse.json({ message: 'Note saved successfully.', note });
  } catch (error) {
    console.error('Failed to save note:', error);
    return NextResponse.json({ message: 'Failed to save note.' }, { status: 500 });
  }
}

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

  const allNotes: MaintenanceNote[] = [];
  for (const logFile of logFiles) {
    if (!logFile.endsWith('.notes.log')) continue;

    const logFilePath = path.join(logDir, logFile);
    try {
      const fileContent = await fs.readFile(logFilePath, 'utf-8');
      const encryptedLogs = fileContent.trim().split('\n');

      for (const encryptedLog of encryptedLogs) {
        if (!encryptedLog) continue;
        try {
          const decryptedLog = decrypt(encryptedLog, encryptionKey);
          if (decryptedLog) {
            allNotes.push(JSON.parse(decryptedLog));
          }
        } catch (e) {
          console.error(`Failed to parse decrypted log from ${logFile}:`, e);
        }
      }
    } catch (error) {
      console.error(`Failed to read or process log file ${logFile}:`, error);
    }
  }

  allNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(allNotes);
}