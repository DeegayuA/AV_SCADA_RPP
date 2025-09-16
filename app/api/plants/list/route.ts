import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const ALLOWED_FILENAME_REGEX = /^config\.([a-zA-Z0-9_-]+)\.ts$/;

export async function GET() {
  try {
    const allFiles = await fs.readdir(CONFIG_DIR);
    const plantNames = allFiles
      .map(file => {
        const match = file.match(ALLOWED_FILENAME_REGEX);
        return match ? match[1] : null;
      })
      .filter((name): name is string => name !== null);

    return NextResponse.json({ plants: plantNames });
  } catch (error) {
    console.error("Error listing plant configurations:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to list plant configurations.', error: errorMessage },
      { status: 500 }
    );
  }
}
