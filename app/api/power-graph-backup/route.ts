
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'power-graph-config.json');

export async function GET() {
  try {
    const config = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(config));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ series: [], exportMode: 'auto' });
    }
    console.error('Failed to read power graph config:', error);
    return NextResponse.json({ message: 'Failed to read power graph config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
    return NextResponse.json({ message: 'Power graph config saved successfully' });
  } catch (error) {
    console.error('Failed to save power graph config:', error);
    return NextResponse.json({ message: 'Failed to save power graph config' }, { status: 500 });
  }
}
