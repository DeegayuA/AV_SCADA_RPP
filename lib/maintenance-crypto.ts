import fs from 'fs/promises';
import path from 'path';

const keyFilePath = path.join(process.cwd(), 'config', 'maintenance.key');

export async function getEncryptionKey(): Promise<Buffer | null> {
  try {
    const key = await fs.readFile(keyFilePath);
    return key;
  } catch (error) {
    return null;
  }
}
