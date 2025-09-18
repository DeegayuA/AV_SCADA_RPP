import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
// A stricter regex for the plant name itself to prevent path traversal or other attacks
const ALLOWED_PLANT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plantName, constantsContent, dataPointsContent } = body;

    if (!plantName || typeof plantName !== 'string' || !ALLOWED_PLANT_NAME_REGEX.test(plantName)) {
        return NextResponse.json({ message: 'Invalid or missing plantName.' }, { status: 400 });
    }

    if (typeof constantsContent !== 'string' || typeof dataPointsContent !== 'string') {
      return NextResponse.json(
        { message: 'Invalid request body. Expecting "constantsContent" and "dataPointsContent" strings.' },
        { status: 400 }
      );
    }

    const dataPointsFileName = `config.${plantName}.ts`;
    const constantsFileName = `config.${plantName}.constants.ts`;

    const dataPointsPath = path.join(CONFIG_DIR, dataPointsFileName);
    const constantsPath = path.join(CONFIG_DIR, constantsFileName);

    // Final check to ensure we are not writing outside the config directory
    if (path.dirname(dataPointsPath) !== CONFIG_DIR || path.dirname(constantsPath) !== CONFIG_DIR) {
        return NextResponse.json({ message: 'Invalid file path detected.' }, { status: 400 });
    }

    await fs.writeFile(dataPointsPath, dataPointsContent, 'utf-8');
    await fs.writeFile(constantsPath, constantsContent, 'utf-8');

    return NextResponse.json({ message: `Successfully imported template for plant: ${plantName}` });

  } catch (error) {
    console.error("Error importing plant template:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to import plant template.', error: errorMessage },
      { status: 500 }
    );
  }
}
