// lib/ai-settings-store.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { toast } from 'sonner';

const DB_NAME = 'SolarMinigridDB'; // Using the same DB name is fine
const STORE_NAME = 'AiSettingsStore';
const SETTINGS_KEY = 'aiSettings';

// --- Interfaces ---
export interface Pill {
  id: string;
  prompt: string;
}

export interface StoredAiSettings {
  encryptedApiKey?: {
    iv: string; // Base64
    salt: string; // Base64
    encryptedData: string; // Base64
  };
  useRainbowBorder: boolean;
  pills: Pill[];
}

interface AiSettingsDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: StoredAiSettings;
  };
}

// --- Cryptography Helpers ---
const getPassword = (): string => {
  // In a real app, this should be derived from user input or a more secure source.
  // For this exercise, we use a hardcoded but not-easily-guessable string.
  const SUPER_SECRET_PASSWORD = "av-mini-grid-super-secret-password-do-not-steal";
  return SUPER_SECRET_PASSWORD;
};

const strToBuf = (str: string): Uint8Array => new TextEncoder().encode(str);
const bufToBase64 = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuf = (b64: string): Uint8Array => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

async function getDerivedKey(salt: Uint8Array): Promise<CryptoKey> {
  const password = getPassword();
  const passwordBuffer = strToBuf(password);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(apiKey: string): Promise<StoredAiSettings['encryptedApiKey']> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const derivedKey = await getDerivedKey(salt);
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    strToBuf(apiKey)
  );

  return {
    iv: bufToBase64(iv),
    salt: bufToBase64(salt),
    encryptedData: bufToBase64(encryptedData),
  };
}

export async function decryptApiKey(encryptedKey: StoredAiSettings['encryptedApiKey']): Promise<string> {
  if (!encryptedKey) throw new Error("No encrypted key provided.");
  const salt = base64ToBuf(encryptedKey.salt);
  const iv = base64ToBuf(encryptedKey.iv);
  const data = base64ToBuf(encryptedKey.encryptedData);
  const derivedKey = await getDerivedKey(salt);
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    derivedKey,
    data
  );
  return new TextDecoder().decode(decryptedData);
}


// --- IndexedDB Functions ---
async function getDb(): Promise<IDBPDatabase<AiSettingsDB>> {
  return openDB<AiSettingsDB>(DB_NAME, 2, { // Version 2 to add the new store
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      }
    },
  });
}

export async function saveAiSettings(settings: StoredAiSettings): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, settings, SETTINGS_KEY);
    console.log('AI settings saved to IndexedDB:', settings);
    toast.success("AI Settings Saved", { description: "Your AI configuration has been stored." });
  } catch (error) {
    console.error('Error saving AI settings to IndexedDB:', error);
    toast.error("IDB Save Error", { description: String(error) });
    throw error;
  }
}

export async function getAiSettings(): Promise<StoredAiSettings | null> {
  try {
    const db = await getDb();
    const data = await db.get(STORE_NAME, SETTINGS_KEY);
    return data || null;
  } catch (error) {
    console.error('Error fetching AI settings from IndexedDB:', error);
    toast.error("IDB Fetch Error", { description: String(error) });
    return null;
  }
}

export async function clearAiSettings(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, SETTINGS_KEY);
    console.log('AI settings cleared from IndexedDB.');
    toast.info("AI Settings Cleared", { description: "Local AI configuration has been removed." });
  } catch (error) {
    console.error('Error clearing AI settings from IndexedDB:', error);
    toast.error("IDB Clear Error", { description: String(error) });
    throw error;
  }
}

export async function exportAiSettingsData(): Promise<Record<string, any>> {
    try {
      const data = await getAiSettings();
      if (data) {
        // We don't export the API key, even encrypted.
        const exportableData = { ...data, encryptedApiKey: undefined };
        return { [SETTINGS_KEY]: exportableData };
      }
      return {};
    } catch (error) {
      console.error("Error preparing AI settings for export:", error);
      return {};
    }
}

export async function importAiSettingsData(data: any): Promise<void> {
    if (data && data[SETTINGS_KEY]) {
        const currentSettings = await getAiSettings() || { pills: [], useRainbowBorder: true };
        const importedSettings = data[SETTINGS_KEY];

        // Merge imported settings but preserve existing API key
        const newSettings: StoredAiSettings = {
            encryptedApiKey: currentSettings.encryptedApiKey,
            pills: importedSettings.pills || [],
            useRainbowBorder: importedSettings.useRainbowBorder !== undefined ? importedSettings.useRainbowBorder : true,
        };
        await saveAiSettings(newSettings);
    }
}
