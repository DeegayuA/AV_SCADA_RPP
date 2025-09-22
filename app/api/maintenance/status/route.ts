import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { getEncryptionKey } from '@/lib/maintenance-crypto';

const IV_LENGTH = 16;

function decrypt(text: string, key: Buffer) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

import glob from 'glob';

export async function GET(request: Request) {
  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    // If no key, there are no logs to decrypt, so return empty array.
    // The UI will show a message to generate the key.
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const month = searchParams.get('month'); // e.g., '2025-09'

  const logDir = path.join(process.cwd(), 'logs', 'maintenance');
  let logFiles: string[] = [];

  if (month) {
    logFiles = glob.sync(`${logDir}/${month}-*.json.log`);
  } else {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const logFilePath = path.join(logDir, `${targetDate}.json.log`);
    try {
      await fs.access(logFilePath);
      logFiles.push(logFilePath);
    } catch (error) {
      // File doesn't exist, logFiles remains empty, which is fine.
    }
  }

  try {
    let allLines: string[] = [];
    for (const file of logFiles) {
      const fileContent = await fs.readFile(file, 'utf-8');
      allLines = allLines.concat(fileContent.trim().split('\n'));
    }

    const lines = allLines.filter(line => line); // Filter out empty lines
    const decryptedLogs = lines.map(line => {
      try {
        return JSON.parse(decrypt(line, encryptionKey));
      } catch (error) {
        console.error('Failed to decrypt or parse log line:', error);
        return null;
      }
    }).filter(log => log !== null);

    return NextResponse.json(decryptedLogs);
  } catch (error) {
    console.error('Failed to read log files:', error);
    return NextResponse.json({ message: 'Failed to read logs.' }, { status: 500 });
  }
}
