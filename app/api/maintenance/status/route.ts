import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MAINTENANCE_ENCRYPTION_KEY;
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('MAINTENANCE_ENCRYPTION_KEY must be defined and be 32 bytes long.');
}

function decrypt(text: string) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY!), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export async function GET(request: Request) {
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
        return JSON.parse(decrypt(line));
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
