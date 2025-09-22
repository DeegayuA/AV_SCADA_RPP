import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cleanupBackups } from '@/lib/cleanup';
import { glob } from 'glob';

async function getMaintenanceFiles() {
  const maintenanceFiles: any = {
    logs: {},
    images: {},
    previews: {},
  };

  const logDir = path.join(process.cwd(), 'logs', 'maintenance');
  const imageDir = path.join(process.cwd(), 'public', 'maintenance_image');
  const previewDir = path.join(process.cwd(), 'public', 'maintenance_image_preview');

  const logFiles = glob.sync(`${logDir}/**/*.json.log`);
  for (const file of logFiles) {
    const date = path.basename(file, '.json.log');
    maintenanceFiles.logs[date] = await fs.readFile(file, 'utf-8');
  }

  const imageFiles = glob.sync(`${imageDir}/**/*.jpg`);
  for (const file of imageFiles) {
    const relativePath = path.relative(imageDir, file);
    maintenanceFiles.images[relativePath] = await fs.readFile(file, 'base64');
  }

  const previewFiles = glob.sync(`${previewDir}/**/*.jpg`);
  for (const file of previewFiles) {
    const relativePath = path.relative(previewDir, file);
    maintenanceFiles.previews[relativePath] = await fs.readFile(file, 'base64');
  }

  return maintenanceFiles;
}

export async function POST(request: Request) {
  try {
    const backupData = await request.json();

    const maintenanceFiles = await getMaintenanceFiles();
    backupData.maintenanceData.logs = maintenanceFiles.logs;
    backupData.maintenanceData.images = maintenanceFiles.images;
    backupData.maintenanceData.previews = maintenanceFiles.previews;

    const username = backupData.createdBy?.replace(/\s+/g, '_') || 'system';
    const localTime = backupData.localTime;

    if (!localTime) {
      throw new Error("localTime not provided in backup data");
    }

    let prefix = 'backup_';
    if (backupData.backupType === 'manual') {
      prefix = 'manual_backup_';
    } else if (backupData.createdBy === 'auto-backup') {
      prefix = 'auto_backup_';
    }

    const filename = `${prefix}${localTime}_${username}.json`;

    const backupsDir = path.join(process.cwd(), 'backups');

    // Ensure the backups directory exists
    try {
      await fs.mkdir(backupsDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }

    const filePath = path.join(backupsDir, filename);
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    // Run cleanup in the background, don't wait for it to finish
    cleanupBackups().catch(err => {
      console.error("Backup cleanup process failed:", err);
    });

    return NextResponse.json({ message: 'Backup created successfully', filename }, { status: 201 });
  } catch (error) {
    console.error('Failed to create backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create backup', error: errorMessage }, { status: 500 });
  }
}
