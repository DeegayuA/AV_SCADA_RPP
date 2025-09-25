import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { getEncryptionKey } from '@/lib/maintenance-crypto';

const IV_LENGTH = 16; // 16 bytes for AES
const IV_HEX_LENGTH = IV_LENGTH * 2; // 32 hex characters

/**
 * Decrypts a string that was encrypted in the format 'iv:ciphertext'.
 * This function is robust against malformed input.
 * @param text The encrypted string.
 * @param key The 32-byte encryption key.
 * @returns The decrypted string, or null if decryption fails.
 */
function decrypt(text: string, key: Buffer): string | null {
  // 1. Basic format check
  if (!text || !text.includes(':')) {
    return null;
  }

  // 2. Split IV and ciphertext
  const textParts = text.split(':');
  const ivHex = textParts.shift()!;
  const encryptedTextHex = textParts.join(':');

  // 3. Validate parts
  // IV must be 16 bytes, which is 32 hex characters.
  if (ivHex.length !== IV_HEX_LENGTH || !/^[0-9a-fA-F]*$/.test(ivHex)) {
      return null;
  }
  // The encrypted text must be a valid hex string.
  if (!/^[0-9a-fA-F]*$/.test(encryptedTextHex)) {
      return null;
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedTextHex, 'hex');

    // The ciphertext length must be a multiple of the AES block size (16 bytes).
    if (encryptedText.length % 16 !== 0) {
        return null;
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // This will catch errors from Buffer.from if hex is invalid,
    // or from decipher.final() if the key is wrong ('bad decrypt').
    return null;
  }
}


import { glob } from 'glob';

export async function GET(request: Request) {
  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    // If no key, there are no logs to decrypt, so return empty array.
    // The UI will show a message to generate the key.
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const month = searchParams.get('month'); // e.g., '2025-09'

  const logDir = path.join(process.cwd(), 'logs', 'maintenance');
  let logFiles: string[] = [];

  if (month) {
    logFiles = glob.sync(`${logDir}/${month}-*.json.log`);
  } else {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const logFilePath = path.join(logDir, `${targetDate}.json.log`);
    try {
      await fs.access(logFilePath);
      logFiles.push(logFilePath);
    } catch (error) {
      // File doesn't exist, logFiles remains empty, which is fine.
    }
  }

  try {
    let allLines: string[] = [];
    for (const file of logFiles) {
      const fileContent = await fs.readFile(file, 'utf-8');
      allLines = allLines.concat(fileContent.trim().split('\n'));
    }

    const lines = allLines.filter(line => line); // Filter out empty lines
    let decryptionFailures = 0;

    const decryptedLogs = lines.map(line => {
      const decryptedLine = decrypt(line, encryptionKey);
      if (decryptedLine === null) {
        decryptionFailures++;
        return null;
      }
      try {
        // We still need to parse the JSON, which could also fail.
        return JSON.parse(decryptedLine);
      } catch {
        decryptionFailures++;
        return null;
      }
    }).filter(log => log !== null);

    if (decryptionFailures > 0) {
      console.warn(`[Maintenance Logs] Skipped ${decryptionFailures} log entr(ies) due to decryption or parsing failure. This is expected if the encryption key has been changed, as old logs cannot be read with the new key.`);
    }

    return NextResponse.json(decryptedLogs);
  } catch (error) {
    console.error('Failed to read log files:', error);
    return NextResponse.json({ message: 'Failed to read logs.' }, { status: 500 });
  }
}
