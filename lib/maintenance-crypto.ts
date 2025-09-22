import fs from 'fs/promises';
import path from 'path';

const keyFilePath = path.join(process.cwd(), 'config', 'maintenance.key');

import crypto from 'crypto';
const IV_LENGTH = 16;

export async function getEncryptionKey(): Promise<Buffer | null> {
  try {
    const key = await fs.readFile(keyFilePath);
    return key;
  } catch (error) {
    return null;
  }
}

export function decrypt(text: string, key: Buffer): string | null {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error("Decryption failed:", error);
        return null;
    }
}
