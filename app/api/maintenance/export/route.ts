import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { glob } from 'glob';
import { getEncryptionKey } from '@/lib/maintenance-crypto';
import Papa from 'papaparse';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

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
    return NextResponse.json({ message: 'Encryption key is not set up on the server.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ message: 'startDate and endDate are required.' }, { status: 400 });
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const logDir = path.join(process.cwd(), 'logs', 'maintenance');

  const interval = eachDayOfInterval({ start: startDate, end: endDate });
  const logFiles = interval.map(day => path.join(logDir, `${format(day, 'yyyy-MM-dd')}.json.log`));

  let allLogs: any[] = [];

  for (const file of logFiles) {
    try {
      await fs.access(file);
      const fileContent = await fs.readFile(file, 'utf-8');
      const lines = fileContent.trim().split('\n').filter(line => line);
      const decryptedLogs = lines.map(line => {
        try {
          return JSON.parse(decrypt(line, encryptionKey));
        } catch (error) {
          return null;
        }
      }).filter(log => log !== null);
      allLogs = allLogs.concat(decryptedLogs);
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  if (allLogs.length === 0) {
    return NextResponse.json({ message: 'No logs found for the selected date range.' }, { status: 404 });
  }

  const csv = Papa.unparse(allLogs);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="maintenance_logs_${startDateStr}_to_${endDateStr}.csv"`,
    },
  });
}
