import fs from 'fs/promises';
import path from 'path';

export async function cleanupBackups() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const files = await fs.readdir(backupsDir).catch(() => []);

  const backups = files
    .map(file => {
      const match = file.match(/^(?:manual_backup_|auto_backup_|backup_)(.+?)_(.+)\.json$/);
      if (!match) return null;

      let date;
      // Handle YYYY-MM-DD_HH-mm format and ISO string format
      if (match[1].includes('T')) {
        // ISO string format e.g., 2023-10-27T10-30-00.000Z
        date = new Date(match[1].replace(/-/g, ':').replace('T', ' '));
      } else {
        // YYYY-MM-DD_HH-mm format
        const [datePart, timePart] = match[1].split('_');
        if (datePart && timePart) {
          date = new Date(`${datePart}T${timePart.replace(/-/g, ':')}`);
        }
      }

      if (date && !isNaN(date.getTime())) {
        return { file, date };
      }
      return null;
    })
    .filter((b): b is { file: string; date: Date } => b !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const filesToKeep = new Set<string>();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime());
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const weeklyBackups = new Map<string, string>(); // Key: YYYY-WW
  const monthlyBackups = new Map<string, string>(); // Key: YYYY-MM

  // Helper to get week number
  const getWeek = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  for (const backup of backups) {
    // Rule 1: Keep all backups from the last 24 hours
    if (backup.date > twentyFourHoursAgo) {
      filesToKeep.add(backup.file);
      continue;
    }

    // Rule 2: Keep one backup per week for the last 3 months
    if (backup.date > threeMonthsAgo) {
      const year = backup.date.getFullYear();
      const week = getWeek(backup.date);
      const weekKey = `${year}-${week}`;
      if (!weeklyBackups.has(weekKey)) {
        weeklyBackups.set(weekKey, backup.file);
      }
      continue;
    }

    // Rule 3: Keep one backup per month for older backups
    const year = backup.date.getFullYear();
    const month = backup.date.getMonth();
    const monthKey = `${year}-${month}`;
    if (!monthlyBackups.has(monthKey)) {
      monthlyBackups.set(monthKey, backup.file);
    }
  }

  weeklyBackups.forEach(file => filesToKeep.add(file));
  monthlyBackups.forEach(file => filesToKeep.add(file));

  const allFiles = await fs.readdir(backupsDir).catch(() => []);
  const filesToDelete = allFiles.filter(file => !filesToKeep.has(file) && /^(manual_backup_|auto_backup_|backup_)/.test(file));

  for (const fileToDelete of filesToDelete) {
    console.log(`Deleting old backup as per retention policy: ${fileToDelete}`);
    await fs.unlink(path.join(backupsDir, fileToDelete)).catch(err => {
      console.error(`Failed to delete backup file ${fileToDelete}:`, err);
    });
  }
}
