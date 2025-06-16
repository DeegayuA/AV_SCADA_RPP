// lib/activityLog.ts
import { useAppStore } from '@/stores/appStore';
import { User } from '@/types/auth';

// Defines the structure of a log entry
export interface ActivityLogEntry {
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  actionType: string;
  details: Record<string, any>;
  pageUrl?: string;
  clientInfo?: {
    userAgent?: string;
    // ipAddress?: string; // Best captured server-side.
  };
  // encryptedPayload?: string; // Field to hold encrypted data if individual entries are encrypted
}

// Placeholder for where logs would be stored or sent
const LOG_STORAGE: ActivityLogEntry[] = []; // Temporary in-memory storage

// --- Encryption Configuration (Conceptual) ---
// const ENCRYPTION_KEY = process.env.LOG_ENCRYPTION_KEY; // Example: Loaded from environment variables on server
// const ALGORITHM = 'aes-256-cbc'; // Example algorithm
// For actual implementation, you'd use Node.js 'crypto' or a library like 'crypto-js'.

/**
 * Conceptually encrypts data.
 * Server-side, this would use Node.js crypto.
 * Client-side (less secure for this use case), could use crypto-js.
 */
/*
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('Encryption key is not set. Data will not be encrypted.');
    return text; // Or throw an error, depending on policy
  }
  // Conceptual:
  // const iv = crypto.randomBytes(16);
  // const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  // let encrypted = cipher.update(text);
  // encrypted = Buffer.concat([encrypted, cipher.final()]);
  // return iv.toString('hex') + ':' + encrypted.toString('hex');
  return `encrypted(${text})`; // Placeholder
}
*/

/**
 * Conceptually decrypts data.
 * Server-side, this would use Node.js crypto.
 */
/*
function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('Encryption key is not set. Data cannot be decrypted.');
    return text; // Or throw an error
  }
  // Conceptual:
  // const parts = text.split(':');
  // const iv = Buffer.from(parts.shift()!, 'hex');
  // const encryptedText = Buffer.from(parts.join(':'), 'hex');
  // const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  // let decrypted = decipher.update(encryptedText);
  // decrypted = Buffer.concat([decrypted, decipher.final()]);
  // return decrypted.toString();
  if (text.startsWith('encrypted(') && text.endsWith(')')) {
    return text.substring(10, text.length - 1); // Placeholder
  }
  return text; // Placeholder
}
*/

export function logActivity(
  actionType: string,
  details: Record<string, any>,
  pageUrl?: string
): void {
  const currentUser = useAppStore.getState().currentUser;
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined;

  const entry: ActivityLogEntry = {
    timestamp: new Date().toISOString(),
    userId: currentUser?.email,
    userName: currentUser?.name,
    userRole: currentUser?.role,
    actionType,
    details, // In a real encrypted setup, 'details' might be the part that gets encrypted
    pageUrl: pageUrl || currentPath,
    clientInfo: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
  };

  // **Encryption Point (Conceptual)**
  // If logs were to be sent to a server for file storage:
  // 1. The raw 'entry.details' (or the whole entry) could be stringified.
  // 2. This stringified data would then be passed to an encrypt function on the server.
  //    const encryptedDetails = serverEncryptFunction(JSON.stringify(entry.details));
  //    const entryForFile = { ...entry, details: encryptedDetails_OR_encryptedPayload: encryptedDetails };
  // 3. The 'entryForFile' would be sent to the API route.
  // Example for client-side (less secure, for demo if needed, not for production .txt file):
  // if (typeof entry.details === 'object') {
  //   entry.encryptedPayload = encrypt(JSON.stringify(entry.details));
  //   delete entry.details; // Remove plain text details if payload is encrypted
  // }


  // Current behavior: Send to a hypothetical API or store in-memory
  // fetch('/api/log-activity', { method: 'POST', body: JSON.stringify(entry) }); // API would handle file write & server-side encryption

  LOG_STORAGE.push(entry);
  if (process.env.NODE_ENV === 'development') {
    console.log('[Activity Log]', entry);
  }
}

export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  // **Decryption Point (Conceptual)**
  // If logs were fetched from a server API that returns encrypted logs:
  // 1. The API (`/api/admin/logs`) would read the encrypted file.
  // 2. For each log line/entry, it would decrypt it using a server-side decrypt function.
  // 3. The API would return the decrypted logs.
  // If decryption were to happen client-side (e.g., admin provides a key):
  //    const fetchedEncryptedLogs = await fetch('/api/admin/logs').then(res => res.json());
  //    return fetchedEncryptedLogs.map(log => {
  //      if (log.encryptedPayload) {
  //        try {
  //          log.details = JSON.parse(decrypt(log.encryptedPayload));
  //          delete log.encryptedPayload;
  //        } catch (e) { console.error('Failed to decrypt log entry', e); log.details = { error: 'decryption_failed' }; }
  //      }
  //      return log;
  //    });

  await new Promise(resolve => setTimeout(resolve, 50));
  return [...LOG_STORAGE].map(log => ({ ...log })); // Return copies
}

export async function clearActivityLogs_ONLY_FOR_DEMO(): Promise<void> {
    LOG_STORAGE.length = 0;
    if (process.env.NODE_ENV === 'development') {
        console.log('[Activity Log] Demo logs cleared.');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
}

// Conceptual API route examples (already commented in the file, ensure they reflect these ideas)
// `pages/api/log-activity.ts` or `app/api/log-activity/route.ts`
// - Would receive the ActivityLogEntry.
// - If server-side encryption is used:
//   - Stringify and encrypt `entry.details` or the whole entry.
//   - Append the encrypted string (e.g., Base64 encoded) to `user_activity.log.txt`.
// - If client-sends-encrypted (less ideal):
//   - Simply write the `entry.encryptedPayload` to the file.

// `pages/api/admin/logs.ts` or `app/api/admin/logs/route.ts`
// - Authenticate/authorize admin.
// - Read `user_activity.log.txt`.
// - For each line (each encrypted log entry):
//   - Decrypt the entry using server-side decryption.
//   - Parse the JSON.
// - Return the array of decrypted ActivityLogEntry objects.

// Example of how an API route might handle writing to a file (conceptual) - from original file
/*
import fs from 'fs/promises';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
// import { ActivityLogEntry } from '@/lib/activityLog'; // Adjust path as needed

const LOG_FILE_PATH = path.resolve(process.cwd(), 'user_activity.log.txt');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const entry = req.body as ActivityLogEntry;
      // Basic validation (improve as needed)
      if (!entry || typeof entry.actionType !== 'string') {
        return res.status(400).json({ message: 'Invalid log entry' });
      }

      // **Server-side Encryption Point**
      // const dataToEncrypt = JSON.stringify(entry.details); // Or whole entry
      // const encryptedData = encrypt(dataToEncrypt); // Using server-side encrypt function
      // const logLine = JSON.stringify({ ...entry, details: undefined, encryptedPayload: encryptedData, serverTimestamp: new Date().toISOString() }) + '\n';

      // For unencrypted logging (as is current example from original file):
      const logLine = JSON.stringify({ serverTimestamp: new Date().toISOString(), ...entry }) + '\n';


      await fs.appendFile(LOG_FILE_PATH, logLine);
      res.status(200).json({ message: 'Log entry saved' });
    } catch (error) {
      console.error('Error writing to log file:', error);
      res.status(500).json({ message: 'Failed to save log entry' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
*/

// Example of how an API route might handle reading the log file (conceptual) - from original file
/*
import fs from 'fs/promises';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
// Assume ActivityLogEntry is defined and accessible
// import { ActivityLogEntry } from '@/lib/activityLog';

const LOG_FILE_PATH = path.resolve(process.cwd(), 'user_activity.log.txt');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Add authentication/authorization checks here

    try {
      const rawData = await fs.readFile(LOG_FILE_PATH, 'utf-8');
      const logLines = rawData.trim().split('\n');
      const logs = logLines.map(line => {
        try {
          const parsedEntry = JSON.parse(line);
          // **Server-side Decryption Point**
          // if (parsedEntry.encryptedPayload) {
          //   parsedEntry.details = JSON.parse(decrypt(parsedEntry.encryptedPayload)); // Using server-side decrypt
          //   delete parsedEntry.encryptedPayload;
          // }
          return parsedEntry;
        } catch (e) {
          console.warn('Failed to parse log line:', line, e);
          return { error: 'Malformed log entry', raw: line };
        }
      }).filter(Boolean);

      res.status(200).json(logs);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(200).json([]);
      }
      console.error('Error reading log file:', error);
      res.status(500).json({ message: 'Failed to read logs' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
*/
