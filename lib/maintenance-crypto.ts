import fs from 'fs/promises';
import path from 'path';

// IMPORTANT: In a production environment, it is strongly recommended to load the
// encryption key from a secure source, such as an environment variable or a
// secret management service, rather than from a file.
const keyFilePath = path.join(process.cwd(), 'config', 'maintenance.key');

import crypto from 'crypto';
const IV_LENGTH = 16;
const KEY_LENGTH = 32; // 256-bit key

export async function getEncryptionKey(): Promise<Buffer | null> {
  try {
    const key = await fs.readFile(keyFilePath);
    if (key.length !== KEY_LENGTH) {
      console.error(`Invalid key length. Expected ${KEY_LENGTH} bytes, but got ${key.length}.`);
      return null;
    }
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Key file not found is a valid state (key not set yet)
      return null;
    }
    console.error("Error reading encryption key:", error);
    return null;
  }
}

export function decrypt(text: string, key: Buffer): string | null {
    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return null; // Not a valid format

        const iv = Buffer.from(textParts.shift()!, 'hex');
        if (iv.length !== IV_LENGTH) return null; // Invalid IV length

        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error: any) {
        // Suppress common 'bad decrypt' errors which can happen with malformed log lines.
        // Log other, unexpected errors.
        if (error.code !== 'ERR_OSSL_BAD_DECRYPT') {
            console.error("An unexpected decryption error occurred:", error);
        }
        return null;
    }
}

export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}
