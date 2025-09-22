import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { logs, images, previews } = await request.json();

    const logDir = path.join(process.cwd(), 'logs', 'maintenance');
    const imageDir = path.join(process.cwd(), 'public', 'maintenance_image');
    const previewDir = path.join(process.cwd(), 'public', 'maintenance_image_preview');

    await fs.mkdir(logDir, { recursive: true });
    await fs.mkdir(imageDir, { recursive: true });
    await fs.mkdir(previewDir, { recursive: true });

    for (const date in logs) {
      const logFilePath = path.join(logDir, `${date}.json.log`);
      await fs.writeFile(logFilePath, logs[date]);
    }

    for (const relativePath in images) {
      const imagePath = path.join(imageDir, relativePath);
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      await fs.writeFile(imagePath, images[relativePath], 'base64');
    }

    for (const relativePath in previews) {
      const previewPath = path.join(previewDir, relativePath);
      await fs.mkdir(path.dirname(previewPath), { recursive: true });
      await fs.writeFile(previewPath, previews[relativePath], 'base64');
    }

    return NextResponse.json({ message: 'Maintenance data restored successfully.' });
  } catch (error) {
    console.error('Maintenance data restore failed:', error);
    return NextResponse.json({ message: 'Maintenance data restore failed.' }, { status: 500 });
  }
}
