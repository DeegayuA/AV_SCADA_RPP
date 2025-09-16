// app/api/onboarding/check-config/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Note: process.cwd() gives the root of the Next.js project
    const configDir = path.join(process.cwd(), 'config');

    // Define paths for the essential configuration files
    const appConfigPath = path.join(configDir, 'appConfig.ts');
    const dataPointsPath = path.join(configDir, 'dataPoints.ts');

    // Check if both configuration files exist
    const appConfigExists = await checkFileExists(appConfigPath);
    const dataPointsExists = await checkFileExists(dataPointsPath);

    const configExists = appConfigExists && dataPointsExists;

    return NextResponse.json({ configExists });
  } catch (error) {
    console.error('Error checking configuration files:', error);
    // Return a generic error response to the client
    return NextResponse.json(
      { error: 'An error occurred while checking the configuration.' },
      { status: 500 }
    );
  }
}
