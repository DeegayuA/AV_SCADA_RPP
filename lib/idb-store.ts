// lib/idb-store.ts
import { VERSION } from '@/config/constants';
import { DataPointConfig } from '@/config/dataPoints'; // Assuming DataPointConfig is the type for a single data point config object
import { openDB, DBSchema, IDBPDatabase } from 'idb';
// Note: 'toast' for user feedback is generally better handled in the UI component
// that calls these functions, but if you prefer it here for logging/errors, import it.
import { toast } from 'sonner'; 

const DB_NAME = 'SolarMinigridDB';
const STORE_NAME = 'AppConfigStore';
const CONFIG_KEY = 'onboardingData'; // This will be the key in the exported JSON for this data

export interface AppOnboardingData {
  plantName: string;
  plantLocation: string;
  plantType: string;
  plantCapacity: string;
  opcUaEndpointOffline: string;
  opcUaEndpointOnline?: string;
  appName?: string;
  configuredDataPoints: DataPointConfig[]; // Array of data point configurations
  onboardingCompleted: boolean;
  version: string; // App version when data was saved
}

interface MyAppDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // Key will be CONFIG_KEY ('onboardingData')
    value: AppOnboardingData;
  };
}

async function getDb(): Promise<IDBPDatabase<MyAppDB>> {
  return openDB<MyAppDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveOnboardingData(
  data: Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>,
): Promise<void> {
  const db = await getDb();
  const fullData: AppOnboardingData = {
    ...data,
    onboardingCompleted: true,
    version: VERSION, // VERSION from constants
  };
  try {
    await db.put(STORE_NAME, fullData, CONFIG_KEY);
    console.log('Onboarding data saved to IndexedDB:', fullData);
    toast.success("Onboarding Data Saved", { description: "Configuration stored successfully in browser." });
  } catch (error) {
    console.error('Error saving onboarding data to IndexedDB:', error);
    toast.error("IDB Save Error", { description: String(error) });
    throw error; // Re-throw for the caller to handle if necessary
  }
}

export async function getOnboardingData(): Promise<AppOnboardingData | null> {
  try {
    const db = await getDb();
    const data = await db.get(STORE_NAME, CONFIG_KEY);
    return data || null;
  } catch (error) {
    console.error('Error fetching onboarding data from IndexedDB:', error);
    toast.error("IDB Fetch Error", { description: String(error) });
    return null; // Or throw error, depending on desired handling
  }
}

export async function clearOnboardingData(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, CONFIG_KEY);
    console.log('Onboarding data cleared from IndexedDB.');
    toast.info("Onboarding Data Cleared", { description: "Local configuration has been removed." });
  } catch (error) {
    console.error('Error clearing onboarding data from IndexedDB:', error);
    toast.error("IDB Clear Error", { description: String(error) });
    throw error;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const data = await getOnboardingData();
  return !!data?.onboardingCompleted;
}

/**
 * Exports all relevant data from this IndexedDB store for backup.
 * In this specific setup, it exports the single 'onboardingData' object.
 * @returns A Promise resolving to an object where keys are data identifiers
 * (e.g., 'onboardingData') and values are the corresponding data.
 * Returns an empty object if no data is found or if an error occurs during fetch.
 */
export async function exportIdbData(): Promise<Record<string, any>> {
  try {
    const data = await getOnboardingData(); // Uses the existing getter
    if (data) {
      // The key here (CONFIG_KEY) will be part of the backup JSON structure.
      // e.g., { "onboardingData": { ... actual onboarding data ... } }
      console.log('IndexedDB data prepared for export:', { [CONFIG_KEY]: data });
      return { [CONFIG_KEY]: data };
    }
    console.log('No IndexedDB data found for export.');
    return {}; // Return empty object if no data
  } catch (error) {
    console.error("Error preparing IndexedDB data for export:", error);
    // The UI component calling this should ideally show a toast.
    // If you want to include an error marker in the data itself:
    // return { _error: `Failed to export IndexedDB data: ${String(error)}` };
    return {}; // Return empty or specific error object
  }
}