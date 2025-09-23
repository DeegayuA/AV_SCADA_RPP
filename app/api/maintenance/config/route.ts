import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { encryptConfig, decryptConfig } from '@/lib/maintenance-config-crypto';

const configFilePath = path.join(process.cwd(), 'config', 'maintenance.json');

export async function GET() {
  let encryptedConfig;
  try {
    encryptedConfig = await fs.readFile(configFilePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read configuration file:', error);
    return NextResponse.json({ message: 'Failed to read configuration file.' }, { status: 500 });
  }

  if (!encryptedConfig) {
    return NextResponse.json([]);
  }

  try {
    const config = await decryptConfig(encryptedConfig);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to decrypt configuration:', error);
    return NextResponse.json({ message: 'Failed to decrypt configuration. The encryption key may have changed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let config;
  try {
    config = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON in request body.' }, { status: 400 });
  }

  let encryptedConfig;
  try {
    encryptedConfig = await encryptConfig(config);
  } catch (error) {
    console.error('Failed to encrypt configuration:', error);
    return NextResponse.json({ message: 'Failed to encrypt configuration.' }, { status: 500 });
  }

  if (!encryptedConfig) {
    return NextResponse.json({ message: 'Failed to encrypt configuration, key might be missing.' }, { status: 500 });
  }

  try {
    await fs.writeFile(configFilePath, encryptedConfig);
    return NextResponse.json({ message: 'Configuration saved successfully.' });
  } catch (error) {
    console.error('Failed to write configuration file:', error);
    return NextResponse.json({ message: 'Failed to write configuration file.' }, { status: 500 });
  }
}
