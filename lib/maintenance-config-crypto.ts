import crypto from 'crypto';
import { getEncryptionKey } from './maintenance-crypto';

const IV_LENGTH = 16;

export async function encryptConfig(config: any): Promise<string | null> {
  const key = await getEncryptionKey();
  if (!key) {
    return null;
  }
  const text = JSON.stringify(config);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function decryptConfig(encryptedConfig: string): Promise<any | null> {
  const key = await getEncryptionKey();
  if (!key) {
    return null;
  }
  const textParts = encryptedConfig.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
}
