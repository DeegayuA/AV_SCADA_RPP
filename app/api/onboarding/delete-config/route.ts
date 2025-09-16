// app/api/onboarding/delete-config/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    // If the file doesn't exist, we can ignore the error
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function POST() {
  try {
    // Note: process.cwd() gives the root of the Next.js project
    const configDir = path.join(process.cwd(), 'config');

    // Define paths for the essential configuration files
    const appConfigPath = path.join(configDir, 'appConfig.ts');
    const dataPointsPath = path.join(configDir, 'dataPoints.ts');

    // Delete both configuration files
    await deleteFile(appConfigPath);
    await deleteFile(dataPointsPath);

    return NextResponse.json({ message: 'Configuration deleted successfully.' });
  } catch (error) {
    console.error('Error deleting configuration files:', error);
    // Return a generic error response to the client
    return NextResponse.json(
      { error: 'An error occurred while deleting the configuration.' },
      { status: 500 }
    );
  }
}
