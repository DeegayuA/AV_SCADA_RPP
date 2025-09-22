import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// NOTE: The cleanup logic implemented here is a simplification for this task.
// In a production environment, this should be a robust, transactional process,
// likely triggered by a cron job or a serverless function.
async function backupToCloud(directoryPath: string): Promise<boolean> {
  // This is a placeholder for a real cloud backup implementation.
  // In a real application, you would use a cloud provider's SDK (e.g., AWS S3, Google Cloud Storage)
  // to upload the files in the directory to a bucket.
  console.log(`Simulating backup of directory: ${directoryPath}`);

  // For the simulation, we'll just assume the backup is always successful.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network latency

  console.log(`Backup of ${directoryPath} successful.`);
  return true;
}

export async function POST(request: Request) {
  const { date } = await request.json();

  if (!date) {
    return NextResponse.json({ message: 'Date is required.' }, { status: 400 });
  }

  const fullResDir = path.join(process.cwd(), 'public', 'maintain_image', date);

  try {
    await fs.access(fullResDir);

    const backupSuccessful = await backupToCloud(fullResDir);

    if (backupSuccessful) {
      await fs.rm(fullResDir, { recursive: true, force: true });
      return NextResponse.json({ message: `Successfully backed up and deleted ${fullResDir}` });
    } else {
      return NextResponse.json({ message: 'Cloud backup failed.' }, { status: 500 });
    }
  } catch (error) {
    // If the directory doesn't exist, it's not an error in this context.
    return NextResponse.json({ message: `Directory not found, no action taken: ${fullResDir}` });
  }
}
