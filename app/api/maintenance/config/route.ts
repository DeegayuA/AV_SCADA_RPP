import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { encryptConfig, decryptConfig } from '@/lib/maintenance-config-crypto';

const configFilePath = path.join(process.cwd(), 'config', 'maintenance.json');

export async function GET() {
  try {
    const encryptedConfig = await fs.readFile(configFilePath, 'utf-8');
    if (!encryptedConfig) {
      return NextResponse.json([]);
    }
    const config = await decryptConfig(encryptedConfig);
    if (!config) {
      return NextResponse.json({ message: 'Failed to decrypt configuration.' }, { status: 500 });
    }
    return NextResponse.json(config);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read configuration:', error);
    return NextResponse.json({ message: 'Failed to read configuration.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();
    const encryptedConfig = await encryptConfig(config);
    if (!encryptedConfig) {
      return NextResponse.json({ message: 'Failed to encrypt configuration.' }, { status: 500 });
    }
    await fs.writeFile(configFilePath, encryptedConfig);
    return NextResponse.json({ message: 'Configuration saved successfully.' });
  } catch (error) {
    console.error('Failed to save configuration:', error);
    return NextResponse.json({ message: 'Failed to save configuration.' }, { status: 500 });
  }
}
