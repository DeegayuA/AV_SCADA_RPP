import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const POWER_GRAPH_CONFIG_PATH = path.join(process.cwd(), 'config', 'power-graph-config.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(POWER_GRAPH_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(fileContent);
    return NextResponse.json(config);
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
    if (!config || !Array.isArray(config.series)) {
      return NextResponse.json({ message: 'Invalid configuration format' }, { status: 400 });
    }
    await fs.writeFile(POWER_GRAPH_CONFIG_PATH, JSON.stringify(config, null, 2));
    return NextResponse.json({ message: 'Power graph config saved successfully' });
  } catch (error) {
    console.error('Failed to save power graph config:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to save power graph config', error: errorMessage }, { status: 500 });
  }
}
