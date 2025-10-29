import fs from 'fs/promises';
import path from 'path';

export async function cleanupBackups() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const allFiles = await fs.readdir(backupsDir).catch(() => []);

  const manualBackups = new Set<string>();
  const autoBackups = [];

  for (const file of allFiles) {
    if (file.startsWith('manual_backup_')) {
      manualBackups.add(file);
    } else if (file.startsWith('auto_backup_') || file.startsWith('backup_')) {
      const match = file.match(/^(?:auto_backup_|backup_)(.+?)_(.+)\.json$/);
      if (!match) continue;

      let date;
      if (match[1].includes('T')) {
        date = new Date(match[1].replace(/-/g, ':').replace('T', ' '));
      } else {
        const [datePart, timePart] = match[1].split('_');
        if (datePart && timePart) {
          date = new Date(`${datePart}T${timePart.replace(/-/g, ':')}`);
        }
      }

      if (date && !isNaN(date.getTime())) {
        autoBackups.push({ file, date });
      }
    }
  }

  // Sort auto backups newest to oldest
  autoBackups.sort((a, b) => b.date.getTime() - a.date.getTime());

  const autoBackupsToKeep = new Set<string>();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime());
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const weeklyBackups = new Map<string, string>();
  const monthlyBackups = new Map<string, string>();

  const getWeek = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  for (const backup of autoBackups) {
    if (backup.date > twentyFourHoursAgo) {
      autoBackupsToKeep.add(backup.file);
      continue;
    }

    if (backup.date > threeMonthsAgo) {
      const year = backup.date.getFullYear();
      const week = getWeek(backup.date);
      const weekKey = `${year}-${week}`;
      if (!weeklyBackups.has(weekKey)) {
        weeklyBackups.set(weekKey, backup.file);
      }
      continue;
    }

    const year = backup.date.getFullYear();
    const month = backup.date.getMonth();
    const monthKey = `${year}-${month}`;
    if (!monthlyBackups.has(monthKey)) {
      monthlyBackups.set(monthKey, backup.file);
    }
  }

  weeklyBackups.forEach(file => autoBackupsToKeep.add(file));
  monthlyBackups.forEach(file => autoBackupsToKeep.add(file));

  // Ensure we always keep at least a few recent auto-backups if available
  const MIN_AUTO_BACKUPS_TO_KEEP = 5;
  for (let i = 0; i < Math.min(autoBackups.length, MIN_AUTO_BACKUPS_TO_KEEP); i++) {
    autoBackupsToKeep.add(autoBackups[i].file);
  }

  const allFilesToKeep = new Set<string>();
  manualBackups.forEach(file => allFilesToKeep.add(file));
  autoBackupsToKeep.forEach(file => allFilesToKeep.add(file));

  const filesToDelete = allFiles.filter(file => !allFilesToKeep.has(file));

  for (const fileToDelete of filesToDelete) {
    // Final safety check to ensure we only delete auto-backup patterns
    if (/^(auto_backup_|backup_)/.test(fileToDelete)) {
      console.log(`Deleting old auto-backup as per retention policy: ${fileToDelete}`);
      await fs.unlink(path.join(backupsDir, fileToDelete)).catch(err => {
        console.error(`Failed to delete backup file ${fileToDelete}:`, err);
      });
    }
  }

  await cleanupGraphHistory();
}

async function cleanupGraphHistory() {
  const historyDir = path.join(process.cwd(), 'logs', 'graph_history');
  try {
    const allFiles = await fs.readdir(historyDir);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    for (const file of allFiles) {
      const match = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
      if (match) {
        const fileDate = new Date(match[1]);
        if (fileDate < oneMonthAgo) {
          console.log(`Deleting old graph history file: ${file}`);
          await fs.unlink(path.join(historyDir, file)).catch(err => {
            console.error(`Failed to delete graph history file ${file}:`, err);
          });
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to cleanup graph history:', error);
    }
    // If the directory doesn't exist, there's nothing to clean up.
  }
}
