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

export async function GET(request: Request) {
  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    // If no key, there are no logs to decrypt, so return empty array.
    // The UI will show a message to generate the key.
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const logDir = path.join(process.cwd(), 'logs', 'maintenance');
  const logFilePath = path.join(logDir, `${date}.json.log`);

  try {
    await fs.access(logFilePath);
    const fileContent = await fs.readFile(logFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
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
    // If the file doesn't exist, return an empty array.
    return NextResponse.json([]);
  }
}
