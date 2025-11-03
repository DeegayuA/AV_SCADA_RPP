import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { getEncryptionKey, decrypt } from '@/lib/maintenance-crypto';
import { MaintenanceNote } from '@/types/maintenance-note';
import sharp from 'sharp';
import { PLANT_LOCATION } from '@/config/constants';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const deviceId = formData.get('deviceId') as string;
    const itemName = formData.get('itemName') as string;
    const itemNumber = formData.get('itemNumber') as string;
    const username = formData.get('username') as string;
    const tags = formData.get('tags') as string;
    const text = formData.get('text') as string;
    const isScheduledCheck = formData.get('isScheduledCheck') === 'true';

    const date = new Date();
    const dateString = format(date, 'yyyy-MM-dd');
    const dateTimeString = format(date, 'yyyyMMdd_HHmmss');

    let filename: string | undefined;
    if (file) {
      const imageDir = path.join(process.cwd(), 'logs', 'maintenance_images', dateString);
      await fs.mkdir(imageDir, { recursive: true });

      filename = `${PLANT_LOCATION}_${itemName.replace(/ /g, '_')}_${itemNumber.replace(/ /g, '_')}_${dateTimeString}_${username.replace(/ /g, '_')}.jpg`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Save the original image
      await fs.writeFile(path.join(imageDir, filename), buffer);

      // Create and save a preview image
      const previewFilename = `preview_${filename}`;
      await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .toFile(path.join(imageDir, previewFilename));
    }

    const note: MaintenanceNote = {
      id: crypto.randomUUID(),
      timestamp: date.toISOString(),
      deviceId,
      itemNumber: parseInt(itemNumber, 10),
      tags: tags ? tags.split(',') : [],
      text,
      author: username,
      imageFilename: filename,
      isScheduledCheck,
      isRead: false,
    };

    await fs.mkdir(logDir, { recursive: true });
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