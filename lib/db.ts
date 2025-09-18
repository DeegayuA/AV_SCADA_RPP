// lib/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DataPoint, DataPointConfig } from '@/config/dataPoints';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { NotificationRule, ActiveAlarm } from '../types';

// Import constants to be saved
import {
  VERSION, PLANT_NAME, PLANT_LOCATION, PLANT_TYPE, PLANT_CAPACITY,
  APP_NAME, APP_URL, APP_KEYWORDS, APP_DESCRIPTION, APP_FAVICON,
  APP_AUTHOR, APP_AUTHOR_URL, APP_COPYRIGHT, APP_COPYRIGHT_URL,
  APP_PRIVACY_POLICY, APP_TERMS_OF_SERVICE, AVAILABLE_SLD_LAYOUT_IDS, USER,
  OPC_UA_ENDPOINT_OFFLINE
} from '@/config/constants';

// --- Merged Interfaces from idb-store.ts ---
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
  version: string;
}

// --- Main Database Schema ---
interface AppConfigValue {
  VERSION: string;
  PLANT_NAME: string;
  PLANT_LOCATION: string;
  PLANT_TYPE: string;
  PLANT_CAPACITY: string;
  APP_NAME: string;
  APP_URL: string;
  APP_KEYWORDS: string;
  APP_DESCRIPTION: string;
  APP_FAVICON: string;
  APP_AUTHOR: string;
  APP_AUTHOR_URL: string;
  APP_COPYRIGHT: string;
  APP_COPYRIGHT_URL: string;
  APP_PRIVACY_POLICY: string;
  APP_TERMS_OF_SERVICE: string;
  AVAILABLE_SLD_LAYOUT_IDS: string[];
  USER: string;
}

interface SolarDB extends DBSchema {
  dataPoints: {
    key: string;
    value: {
      timestamp: number;
      value: number | boolean;
    };
  };
  controlQueue: {
    key: string;
    value: {
      nodeId: string;
      value: number | boolean;
      timestamp: number;
    };
  };
  appConfig: {
    key: string;
    value: AppConfigValue;
  };
  notificationRules: {
    key: string;
    value: NotificationRule;
    indexes: { isEnabled: 'boolean' };
  };
  activeAlarms: {
    key: string;
    value: ActiveAlarm;
    indexes: { ruleId: 'string'; acknowledged: 'boolean' };
  };
  onboardingData: { // <-- New store, merged from idb-store.ts
    key: string;
    value: AppOnboardingData;
  };
}

const DB_NAME = 'solar-minigrid'; // Single DB name
const DB_VERSION = 4; // Incremented version for schema change
const APP_CONFIG_KEY = 'mainConfiguration';
const ONBOARDING_CONFIG_KEY = 'onboardingData'; // Key for the onboarding data

let dbPromise: Promise<IDBPDatabase<SolarDB> | null> | null = null;

export async function initDB(): Promise<IDBPDatabase<SolarDB> | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    try {
      console.log(`Initializing database '${DB_NAME}' version '${DB_VERSION}'...`);
      const db = await openDB<SolarDB>(DB_NAME, DB_VERSION, {
        upgrade(dbInstance, oldVersion, newVersion, transaction) {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}...`);

          if (oldVersion < 1) {
            dbInstance.createObjectStore('dataPoints');
            dbInstance.createObjectStore('controlQueue');
          }
          if (oldVersion < 2) {
            dbInstance.createObjectStore('appConfig');
          }
          if (oldVersion < 3) {
            const notificationRulesStore = dbInstance.createObjectStore('notificationRules', { keyPath: 'id' });
            notificationRulesStore.createIndex('isEnabled', 'isEnabled', { unique: false });

            const activeAlarmsStore = dbInstance.createObjectStore('activeAlarms', { keyPath: 'id' });
            activeAlarmsStore.createIndex('ruleId', 'ruleId', { unique: false });
            activeAlarmsStore.createIndex('acknowledged', 'acknowledged', { unique: false });
          }
          if (oldVersion < 4) { // <-- Add the new object store
            if (!dbInstance.objectStoreNames.contains('onboardingData')) {
              dbInstance.createObjectStore('onboardingData');
              console.log("Created 'onboardingData' object store.");
            }
          }
        },
        blocked() {
          console.error('IndexedDB blocked.');
          toast.error("Database Blocked", { description: "Please close other instances of this app." });
        },
        blocking() {
          console.warn('IndexedDB blocking.');
          toast.warning("Database Update Pending", { description: "Please refresh other open tabs." });
        },
        terminated() {
          console.error('IndexedDB connection terminated.');
          toast.error("Database Connection Lost");
          dbPromise = null;
        },
      });
      console.log("Database initialized successfully");
      return db;
    } catch (error) {
      console.error("Error initializing the database:", error);
      toast.error("Database Initialization Failed", { description: error instanceof Error ? error.message : "Could not initialize local storage." });
      dbPromise = null;
      return null;
    }
  })();
  return dbPromise;
}

// --- Onboarding Data Functions (from idb-store.ts) ---

export async function saveOnboardingData(data: Omit<AppOnboardingData, 'onboardingCompleted' | 'version'>): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot save onboarding data." });
    return;
  }
  const fullData: AppOnboardingData = {
    ...data,
    onboardingCompleted: true,
    version: VERSION,
  };
  try {
    await db.put('onboardingData', fullData, ONBOARDING_CONFIG_KEY);
    toast.success("Onboarding Data Saved");
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    toast.error("Onboarding Save Failed", { description: String(error) });
    throw error;
  }
}

export async function getOnboardingData(): Promise<AppOnboardingData | null> {
  const db = await initDB();
  if (!db) return null;
  try {
    const data = await db.get('onboardingData', ONBOARDING_CONFIG_KEY);
    return data || null;
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    toast.error("Onboarding Fetch Failed", { description: String(error) });
    return null;
  }
}

export async function clearOnboardingData(): Promise<void> {
  const db = await initDB();
  if (!db) return;
  try {
    await db.delete('onboardingData', ONBOARDING_CONFIG_KEY);
    toast.info("Onboarding Data Cleared");
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
    toast.error("Onboarding Clear Failed", { description: String(error) });
    throw error;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const data = await getOnboardingData();
  return !!data?.onboardingCompleted;
}

export async function exportIdbData(): Promise<Record<string, any>> {
  try {
    const data = await getOnboardingData();
    if (data) {
      return { [ONBOARDING_CONFIG_KEY]: data };
    }
    return {};
  } catch (error) {
    console.error("Error preparing IndexedDB data for export:", error);
    return {};
  }
}


// --- App Configuration Functions ---

export async function saveAppConfig() {
  if (typeof window === 'undefined') return;
  const db = await initDB();
  if (!db) return;

  const configData: AppConfigValue = {
    VERSION, PLANT_NAME, PLANT_LOCATION, PLANT_TYPE, PLANT_CAPACITY,
    APP_NAME, APP_URL, APP_KEYWORDS, APP_DESCRIPTION, APP_FAVICON,
    APP_AUTHOR, APP_AUTHOR_URL, APP_COPYRIGHT, APP_COPYRIGHT_URL,
    APP_PRIVACY_POLICY, APP_TERMS_OF_SERVICE, AVAILABLE_SLD_LAYOUT_IDS, USER
  };

  try {
    await db.put('appConfig', configData, APP_CONFIG_KEY);
  } catch (error) {
    console.error("Error saving app configuration:", error);
  }
}

export async function getAppConfig(): Promise<AppConfigValue | null> {
   if (typeof window === 'undefined') return null;
  const db = await initDB();
  if (!db) return null;

  try {
    const config = await db.get('appConfig', APP_CONFIG_KEY);
    return config || null;
  } catch (error) {
    console.error("Error retrieving app configuration:", error);
    return null;
  }
}

// --- DataPoint and Control Queue Functions ---

export async function updateDataPoint(nodeId: string, value: number | boolean) {
  const db = await initDB();
  if (!db) return;
  try {
    await db.put('dataPoints', { timestamp: Date.now(), value }, nodeId);
  } catch (error) {
    console.error(`Error updating DataPoint ${nodeId} in IDB:`, error);
  }
}

export const getDataPoint = async (nodeId: string): Promise<{ value: any, timestamp?: number } | { value: string, error?: any }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject({ value: 'Error Fetching Data', error: 'WebSocket unavailable' });
    }
    const wsUrl = `ws://${window.location.hostname}:${window.location.port}/opcua/data`;
    let ws: WebSocket;
    try {
       ws = new WebSocket(wsUrl);
    } catch (e) {
        return reject({ value: 'Error Fetching Data', error: 'WebSocket initialization failed' });
    }
    
    const timeout = setTimeout(() => {
      ws.close();
      reject({ value: 'Error Fetching Data', error: 'Connection timeout' });
    }, 5000);

    ws.onopen = () => ws.send(JSON.stringify({ nodeId }));
    ws.onmessage = (event) => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(event.data as string);
        if (data.error) reject({ value: 'Error Fetching Data', error: data.error });
        else resolve(data);
      } catch (e) {
        reject({ value: 'Error Fetching Data', error: 'Invalid data format' });
      } finally {
        ws.close();
      }
    };
    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject({ value: 'Error Fetching Data', error });
      ws.close();
    };
  });
};

export async function queueControlAction(nodeId: string, value: number | boolean) {
  const db = await initDB();
  if (!db) return;
  const actionKey = `${nodeId}-${Date.now()}`;
  try {
    await db.put('controlQueue', { nodeId, value, timestamp: Date.now() }, actionKey);
    toast.info("Control Action Queued");
  } catch (error) {
     console.error(`Error queuing control action ${actionKey}:`, error);
  }
}

export async function getControlQueue() {
  const db = await initDB();
  if (!db) return [];
  try {
    return await db.getAll('controlQueue');
  } catch (error) {
    console.error(`Error retrieving control queue:`, error);
    return [];
  }
}

export async function clearControlQueue() {
  const db = await initDB();
  if (!db) return;
  try {
    await db.clear('controlQueue');
    toast.success("Control Queue Cleared");
  } catch (error) {
    console.error(`Error clearing control queue:`, error);
  }
}

// --- NotificationRule CRUD Functions ---

export async function addNotificationRule(rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  const now = new Date();
  const newRule: NotificationRule = { ...rule, id: rule.id || uuidv4(), createdAt: now, updatedAt: now };
  await db.add('notificationRules', newRule);
  toast.success("Notification Rule Added");
  return newRule.id;
}

export async function getNotificationRule(id: string): Promise<NotificationRule | undefined> {
  const db = await initDB();
  if (!db) return undefined;
  return await db.get('notificationRules', id);
}

export async function getAllNotificationRules(): Promise<NotificationRule[]> {
  const db = await initDB();
  if (!db) return [];
  return await db.getAll('notificationRules');
}

export async function updateNotificationRule(ruleUpdate: Partial<NotificationRule> & { id: string }): Promise<void> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  const existingRule = await db.get('notificationRules', ruleUpdate.id);
  if (!existingRule) throw new Error(`Rule ${ruleUpdate.id} not found.`);
  const updatedRule = { ...existingRule, ...ruleUpdate, updatedAt: new Date() };
  await db.put('notificationRules', updatedRule);
  toast.success("Notification Rule Updated");
}

export async function deleteNotificationRule(id: string): Promise<void> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  await db.delete('notificationRules', id);
  await deleteActiveAlarmsByRuleId(id);
  toast.success("Notification Rule Deleted");
}

// --- ActiveAlarm CRUD Functions ---

export async function addActiveAlarm(alarm: Omit<ActiveAlarm, 'id' | 'triggeredAt' | 'lastNotifiedAt'> & { id?: string }): Promise<string> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  const now = new Date();
  const newAlarm: ActiveAlarm = { ...alarm, id: alarm.id || uuidv4(), triggeredAt: now, lastNotifiedAt: now };
  await db.add('activeAlarms', newAlarm);
  toast.info("New Active Alarm");
  return newAlarm.id;
}

export async function getAllActiveAlarms(): Promise<ActiveAlarm[]> {
  const db = await initDB();
  if (!db) return [];
  return await db.getAll('activeAlarms');
}

export async function updateActiveAlarm(alarmUpdate: Partial<ActiveAlarm> & { id: string }): Promise<void> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  const existingAlarm = await db.get('activeAlarms', alarmUpdate.id);
  if (!existingAlarm) throw new Error(`Alarm ${alarmUpdate.id} not found.`);
  const updatedAlarm = { ...existingAlarm, ...alarmUpdate };
  await db.put('activeAlarms', updatedAlarm);
  toast.success("Active Alarm Updated");
}

export async function deleteActiveAlarm(id: string): Promise<void> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  await db.delete('activeAlarms', id);
  toast.success("Active Alarm Deleted");
}

export async function deleteActiveAlarmsByRuleId(ruleId: string): Promise<void> {
  const db = await initDB();
  if (!db) throw new Error("Database not initialized");
  const tx = db.transaction('activeAlarms', 'readwrite');
  const index = tx.store.index('ruleId');
  let cursor = await index.openCursor(IDBKeyRange.only(ruleId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}