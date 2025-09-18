import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const ALLOWED_PLANT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plantName } = body;

    if (!plantName || typeof plantName !== 'string' || !ALLOWED_PLANT_NAME_REGEX.test(plantName)) {
      return NextResponse.json({ message: 'Invalid or missing plantName.' }, { status: 400 });
    }

    const sourceDataPointsPath = path.join(CONFIG_DIR, `config.${plantName}.ts`);
    const sourceConstantsPath = path.join(CONFIG_DIR, `config.${plantName}.constants.ts`);

    const destDataPointsPath = path.join(CONFIG_DIR, 'dataPoints.ts');
    const destConstantsPath = path.join(CONFIG_DIR, 'constants.ts');

    // Check if source files exist
    try {
      await fs.access(sourceDataPointsPath);
      await fs.access(sourceConstantsPath);
    } catch (e) {
      return NextResponse.json({ message: `Configuration files for plant "${plantName}" not found.` }, { status: 404 });
    }

    // Copy the files
    await fs.copyFile(sourceDataPointsPath, destDataPointsPath);
    await fs.copyFile(sourceConstantsPath, destConstantsPath);

    return NextResponse.json({ message: `Successfully activated plant configuration for: ${plantName}` });

  } catch (error) {
    console.error("Error activating plant configuration:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to activate plant configuration.', error: errorMessage },
      { status: 500 }
    );
  }
}
