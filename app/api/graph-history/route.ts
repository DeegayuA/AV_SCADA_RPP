
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFormattedTimestamp } from '@/lib/timeUtils'; // Assuming you have this utility

const HISTORY_DIR = path.join(process.cwd(), 'logs', 'graph_history');

// Ensure the history directory exists
async function ensureHistoryDir() {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
    await ensureHistoryDir();
    const data = await request.json();
    const timestamp = new Date().toISOString();
    const day = timestamp.substring(0, 10); // YYYY-MM-DD
    const filePath = path.join(HISTORY_DIR, `${day}.json`);

    const newData = { ...data, timestamp };

    // Append to the daily file
    await fs.appendFile(filePath, JSON.stringify(newData) + '\n');

    return NextResponse.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Failed to save graph history:', error);
    return NextResponse.json({ message: 'Failed to save graph history' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await ensureHistoryDir();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) {
      return NextResponse.json({ message: 'Date parameter is required' }, { status: 400 });
    }

    const filePath = path.join(HISTORY_DIR, `${date}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    const lines = data.trim().split('\n').map(line => JSON.parse(line));
    return NextResponse.json(lines);

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read graph history:', error);
    return NextResponse.json({ message: 'Failed to read graph history' }, { status: 500 });
  }
}
