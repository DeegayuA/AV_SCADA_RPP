import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const ALLOWED_FILENAME_REGEX = /^(config\.[a-zA-Z0-9_-]+\.ts|config\.[a-zA-Z0-9_-]+\.constants\.ts)$/;

export async function GET() {
  try {
    const allFilenames = await fs.readdir(CONFIG_DIR);
    const fileContents: Record<string, string> = {};

    for (const filename of allFilenames) {
      // Check if the file is either a plant-specific config or one of the active configs
      if (ALLOWED_FILENAME_REGEX.test(filename) || filename === 'dataPoints.ts' || filename === 'constants.ts') {
        const filePath = path.join(CONFIG_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        fileContents[filename] = content;
      }
    }

    return NextResponse.json(fileContents);
  } catch (error) {
    console.error("Error reading plant config files:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to read configuration files.', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ message: 'Invalid request body. Expecting a JSON object of filename-content pairs.' }, { status: 400 });
    }

    for (const filename in body) {
        if (Object.prototype.hasOwnProperty.call(body, filename)) {
            const content = body[filename];

            // CRITICAL SECURITY CHECK
            if (!ALLOWED_FILENAME_REGEX.test(filename) && filename !== 'dataPoints.ts' && filename !== 'constants.ts') {
                console.warn(`Skipping potentially unsafe file write: ${filename}`);
                continue; // Skip this file
            }

            if (typeof content !== 'string') {
                return NextResponse.json({ message: `Invalid content for file ${filename}. Must be a string.`}, { status: 400 });
            }

            const filePath = path.join(CONFIG_DIR, filename);

            // Redundant check, but good for defense-in-depth. Ensures no path traversal.
            if (path.dirname(filePath) !== CONFIG_DIR) {
                 return NextResponse.json({ message: `Attempted to write outside of the config directory: ${filename}`}, { status: 400 });
            }

            await fs.writeFile(filePath, content, 'utf-8');
        }
    }

    return NextResponse.json({ message: 'Plant configuration files updated successfully.' });

  } catch (error) {
    console.error("Error writing plant config files:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'Failed to write configuration files.', error: errorMessage },
      { status: 500 }
    );
  }
}
