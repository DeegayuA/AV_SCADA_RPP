import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.resolve(process.cwd(), 'config/smtp.config.json');

export async function GET() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading SMTP settings:', error);
    return NextResponse.json({ message: 'Failed to read settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newSettings = await request.json();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error writing SMTP settings:', error);
    return NextResponse.json({ message: 'Failed to save settings' }, { status: 500 });
  }
}
