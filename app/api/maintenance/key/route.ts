import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const keyFilePath = path.join(process.cwd(), 'config', 'maintenance.key');

export async function GET() {
  try {
    await fs.access(keyFilePath);
    return NextResponse.json({ keyExists: true });
  } catch (error) {
    return NextResponse.json({ keyExists: false });
  }
}

export async function POST() {
  try {
    const newKey = crypto.randomBytes(32);
    await fs.writeFile(keyFilePath, newKey);
    return NextResponse.json({ message: 'Encryption key generated successfully.' });
  } catch (error) {
    console.error('Failed to generate encryption key:', error);
    return NextResponse.json({ message: 'Failed to generate encryption key.' }, { status: 500 });
  }
}
