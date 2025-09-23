import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { getEncryptionKey } from '@/lib/maintenance-crypto';

const IV_LENGTH = 16;

function decrypt(text: string, key: Buffer): string | null {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      console.warn(`Malformed encrypted data (incorrect parts): "${text}"`);
      return null;
    }

    const ivHex = textParts[0];
    const encryptedTextHex = textParts[1];

    if (!ivHex || !encryptedTextHex || ivHex.length !== IV_LENGTH * 2) {
      console.warn(`Malformed encrypted data (invalid iv or text): "${text}"`);
      return null;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedTextHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error(`Decryption failed for text: "${text}". Error:`, error);
    return null;
  }
}

import { glob } from 'glob';

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
      const decryptedLine = decrypt(line, encryptionKey);
      if (decryptedLine) {
        try {
          return JSON.parse(decryptedLine);
        } catch (error) {
          console.error('Failed to parse decrypted log line:', error);
          return null;
        }
      }
      return null;
    }).filter(log => log !== null);

    return NextResponse.json(decryptedLogs);
  } catch (error) {
    console.error('Failed to read log files:', error);
    return NextResponse.json({ message: 'Failed to read logs.' }, { status: 500 });
  }
}
