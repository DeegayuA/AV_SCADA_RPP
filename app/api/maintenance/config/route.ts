import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// NOTE: This file-based approach is a simplification for this task and is not suitable for a production environment.
// In a production environment, a database should be used for storing configuration data.
const configPath = path.join(process.cwd(), 'config', 'maintenance.json');

export async function POST(request: Request) {
  try {
    const config = await request.json();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return NextResponse.json({ message: 'Configuration saved successfully.' });
  } catch (error) {
    console.error('Failed to save maintenance configuration:', error);
    return NextResponse.json({ message: 'Failed to save configuration.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await fs.access(configPath);
    const configData = await fs.readFile(configPath, 'utf-8');
    return NextResponse.json(JSON.parse(configData));
  } catch (error) {
    // If the file doesn't exist, return an empty array.
    return NextResponse.json([]);
  }
}
