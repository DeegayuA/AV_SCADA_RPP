// lib/idb-store.ts
import { VERSION } from '@/config/constants';
import { DataPointConfig } from '@/config/dataPoints';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'SolarMinigridDB';
const STORE_NAME = 'AppConfigStore';
const CONFIG_KEY = 'onboardingData';

export interface AppOnboardingData {
  plantName: string;
  plantLocation: string;
  plantType: string;
  plantCapacity: string;
  opcUaEndpointOffline: string;
  opcUaEndpointOnline?: string;
  appName?: string;
  configuredDataPoints: DataPointConfig[];
  onboardingCompleted: boolean;
  version: string; // App version when data was saved
}

interface MyAppDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
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
    version: VERSION,
  };
  await db.put(STORE_NAME, fullData, CONFIG_KEY);
  console.log('Onboarding data saved to IndexedDB:', fullData);
}

export async function getOnboardingData(): Promise<AppOnboardingData | null> {
  const db = await getDb();
  const data = await db.get(STORE_NAME, CONFIG_KEY);
  return data || null;
}

export async function clearOnboardingData(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, CONFIG_KEY);
  console.log('Onboarding data cleared from IndexedDB.');
}

// Utility to check if onboarding is complete without fetching all data (optional, but efficient)
export async function isOnboardingComplete(): Promise<boolean> {
  const data = await getOnboardingData();
  return !!data?.onboardingCompleted;
}