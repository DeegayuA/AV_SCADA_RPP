import fs from 'fs/promises';
import path from 'path';

export async function cleanupBackups() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const files = await fs.readdir(backupsDir).catch(() => []);

  const backups = files
    .map(file => {
      const match = file.match(/^backup-(.+)\.json$/);
      if (!match) return null;

      const timestampPart = match[1];
      const timeParts = timestampPart.split('T');
      if (timeParts.length !== 2) return null;
      const datePart = timeParts[0];
      const timeString = timeParts[1].replace(/-/g, ':');
      const validTimestampStr = `${datePart}T${timeString}`;

      const date = new Date(validTimestampStr);
      return { file, date };
    })
    .filter((b): b is { file: string; date: Date } => b !== null && !isNaN(b.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const filesToKeep = new Set<string>();
  const filesByDay = new Map<string, { file: string; date: Date }>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const backup of backups) {
    if (backup.date < thirtyDaysAgo) {
      continue;
    }

    const dayKey = backup.date.toISOString().split('T')[0];
    if (!filesByDay.has(dayKey)) {
      filesByDay.set(dayKey, backup);
    }
  }

  filesByDay.forEach(backup => filesToKeep.add(backup.file));

  const filesToDelete = backups.filter(b => !filesToKeep.has(b.file));

  for (const fileToDelete of filesToDelete) {
    console.log(`Deleting old backup: ${fileToDelete.file}`);
    await fs.unlink(path.join(backupsDir, fileToDelete.file)).catch(err => {
      console.error(`Failed to delete backup file ${fileToDelete.file}:`, err);
    });
  }
}
