import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const IV_LENGTH = 16;
const KEY_PATH = path.join(process.cwd(), 'config', 'users-key.enc');

let key: Buffer | null = null;

async function getKey(): Promise<Buffer | null> {
  if (key) {
    return key;
  }
  try {
    const keyHex = await fs.readFile(KEY_PATH, 'utf-8');
    key = Buffer.from(keyHex.trim(), 'hex');
    return key;
  } catch (error) {
    console.error('Error reading encryption key:', error);
    return null;
  }
}

export async function encryptUsers(users: any): Promise<string | null> {
  const encryptionKey = await getKey();
  if (!encryptionKey) {
    return null;
  }
  const text = JSON.stringify(users);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function decryptUsers(encryptedUsers: string): Promise<any | null> {
  const encryptionKey = await getKey();
  if (!encryptionKey) {
    return null;
  }
  const textParts = encryptedUsers.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
}