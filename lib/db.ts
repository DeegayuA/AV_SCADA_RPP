// lib/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DataPoint } from '@/config/dataPoints'; // Assuming this is used elsewhere or for future plans
import { toast } from 'sonner'; // Import toast for notifications
import { v4 as uuidv4 } from 'uuid';
import { NotificationRule, ActiveAlarm } from '../types';
import { MaintenanceItem } from '@/types/maintenance'; // Assuming a new type definition file

// Import constants to be saved
import {
  VERSION, PLANT_NAME, PLANT_LOCATION, PLANT_TYPE, PLANT_CAPACITY,
  APP_NAME, APP_URL, APP_KEYWORDS, APP_DESCRIPTION, APP_FAVICON,
  APP_AUTHOR, APP_AUTHOR_URL, APP_COPYRIGHT, APP_COPYRIGHT_URL,
  APP_PRIVACY_POLICY, APP_TERMS_OF_SERVICE, AVAILABLE_SLD_LAYOUT_IDS, USER
  // Note: WS_PORT, WS_URL, OPC_UA_ENDPOINT_OFFLINE, OPC_UA_ENDPOINT_ONLINE are typically
  // environment-dependent or dynamically calculated, so storing their initial values might
  // not be ideal. APP_LOGO and APP_LOGO2 are module imports, not simple strings suitable for IDB.
} from '@/config/constants';

// Interface for the application configuration data
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
  maintenanceConfig: {
    key: string;
    value: MaintenanceItem[];
  };
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
  appConfig: { // New object store for application configuration
    key: string; // We'll use a single key like 'mainConfiguration'
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
}

export const DB_NAME = 'solar-minigrid';
const DB_VERSION = 4; // Incremented version due to new object stores
const APP_CONFIG_KEY = 'mainConfiguration'; // Key for the single config object
const MAINTENANCE_CONFIG_KEY = 'maintenanceConfiguration'; // Key for the maintenance config

let dbPromise: Promise<IDBPDatabase<SolarDB> | null> | null = null;

export async function initDB(): Promise<IDBPDatabase<SolarDB> | null> {
  if (typeof window === 'undefined') {
    console.error("IndexedDB is not available on the server.");
    // toast.error("Offline Storage Unavailable", { description: "Cannot initialize local database on server." }); // Toast won't work on server
    return null;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    try {
      console.log("Initializing database...");
      const db = await openDB<SolarDB>(DB_NAME, DB_VERSION, {
        upgrade(dbInstance, oldVersion, newVersion, transaction) {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}...`);
          
          // Create 'dataPoints' store if it doesn't exist (from version < 1)
          if (oldVersion < 1) {
            if (!dbInstance.objectStoreNames.contains('dataPoints')) {
              dbInstance.createObjectStore('dataPoints');
              console.log("Created 'dataPoints' object store.");
            }
            if (!dbInstance.objectStoreNames.contains('controlQueue')) {
              dbInstance.createObjectStore('controlQueue');
              console.log("Created 'controlQueue' object store.");
            }
          }

          // Create 'appConfig' store if it doesn't exist (from version < 2)
          if (oldVersion < 2) {
            if (!dbInstance.objectStoreNames.contains('appConfig')) {
              dbInstance.createObjectStore('appConfig');
              console.log("Created 'appConfig' object store.");
            }
          }
          // Create notificationRules and activeAlarms stores if they don't exist (from version < 3)
          if (oldVersion < 3) {
            if (!dbInstance.objectStoreNames.contains('notificationRules')) {
              const notificationRulesStore = dbInstance.createObjectStore('notificationRules', { keyPath: 'id' });
              notificationRulesStore.createIndex('isEnabled', 'isEnabled', { unique: false });
              console.log("Created 'notificationRules' object store and 'isEnabled' index.");
            }
            if (!dbInstance.objectStoreNames.contains('activeAlarms')) {
              const activeAlarmsStore = dbInstance.createObjectStore('activeAlarms', { keyPath: 'id' });
              activeAlarmsStore.createIndex('ruleId', 'ruleId', { unique: false });
              activeAlarmsStore.createIndex('acknowledged', 'acknowledged', { unique: false });
              console.log("Created 'activeAlarms' object store and 'ruleId', 'acknowledged' indexes.");
            }
          }
           // Create maintenanceConfig store if it doesn't exist (from version < 4)
           if (oldVersion < 4) {
            if (!dbInstance.objectStoreNames.contains('maintenanceConfig')) {
              dbInstance.createObjectStore('maintenanceConfig');
              console.log("Created 'maintenanceConfig' object store.");
            }
          }
        },
        blocked() {
          console.error('IndexedDB blocked. Please close other tabs using this database.');
          toast.error("Database Blocked", { description: "Please close other instances of this app and refresh."});
        },
        blocking() {
          console.warn('IndexedDB blocking. Other tabs might be outdated.');
          toast.warning("Database Update Pending", { description: "A new version of the app needs to update the database. Please refresh other open tabs."});
        },
        terminated() {
          console.error('IndexedDB connection terminated unexpectedly.');
          toast.error("Database Connection Lost", { description: "Local storage connection was terminated."});
          dbPromise = null; // Reset promise to allow re-initialization
        },
      });
      console.log("Database initialized successfully");
      toast.success("Local Storage Ready", { description: "Offline capabilities enabled."});
      return db;
    } catch (error) {
      console.error("Error initializing the database:", error);
      toast.error("Database Initialization Failed", { description: error instanceof Error ? error.message : "Could not initialize local storage." });
      dbPromise = null; // Reset promise on error
      return null; 
    }
  })();
  return dbPromise;
}

export async function closeDB() {
    if (dbPromise) {
        const db = await dbPromise;
        db?.close();
        dbPromise = null;
        console.log("Database connection closed.");
    }
}

// --- App Configuration Functions ---

export async function saveAppConfig() {
  if (typeof window === 'undefined') {
    // This might be called during SSR or pre-rendering where window is not available.
    // console.warn("Cannot save app config: IndexedDB is not available on the server.");
    return;
  }

  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Failed to save app configuration." });
    return;
  }

  const configData: AppConfigValue = {
    VERSION, PLANT_NAME, PLANT_LOCATION, PLANT_TYPE, PLANT_CAPACITY,
    APP_NAME, APP_URL, APP_KEYWORDS, APP_DESCRIPTION, APP_FAVICON,
    APP_AUTHOR, APP_AUTHOR_URL, APP_COPYRIGHT, APP_COPYRIGHT_URL,
    APP_PRIVACY_POLICY, APP_TERMS_OF_SERVICE, AVAILABLE_SLD_LAYOUT_IDS, USER
  };

  try {
    await db.put('appConfig', configData, APP_CONFIG_KEY);
    toast.success("App Configuration Saved", { description: `Version ${VERSION} settings stored locally.`});
    console.log("App configuration saved to IndexedDB:", configData);
  } catch (error) {
    console.error("Error saving app configuration:", error);
    toast.error("Configuration Save Failed", { description: error instanceof Error ? error.message : String(error) });
  }
}

// --- Maintenance Configuration Functions ---

export async function saveMaintenanceConfig(config: MaintenanceItem[]) {
  if (typeof window === 'undefined') return;
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Failed to save maintenance configuration." });
    return;
  }
  try {
    await db.put('maintenanceConfig', config, MAINTENANCE_CONFIG_KEY);
    toast.success("Maintenance Configuration Saved", { description: "Settings stored locally."});
  } catch (error) {
    console.error("Error saving maintenance configuration:", error);
    toast.error("Maintenance Config Save Failed", { description: error instanceof Error ? error.message : String(error) });
  }
}

export async function getMaintenanceConfig(): Promise<MaintenanceItem[]> {
  if (typeof window === 'undefined') return [];
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot retrieve maintenance configuration.");
    return [];
  }
  try {
    const config = await db.get('maintenanceConfig', MAINTENANCE_CONFIG_KEY);
    return config || [];
  } catch (error) {
    console.error("Error retrieving maintenance configuration:", error);
    toast.error("Maintenance Config Load Failed", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function getAppConfig(): Promise<AppConfigValue | null> {
   if (typeof window === 'undefined') {
    console.warn("Cannot get app config: IndexedDB is not available on the server.");
    return null;
  }
  const db = await initDB();
  if (!db) {
    // Not showing toast here as this might be called frequently or on startup.
    console.error("Database not ready, cannot retrieve app configuration.");
    return null;
  }

  try {
    const config = await db.get('appConfig', APP_CONFIG_KEY);
    if (config) {
      console.log("App configuration loaded from IndexedDB:", config);
      toast.info("App configuration loaded locally."); // Potentially too verbose
      return config;
    } else {
      console.warn("No app configuration found in IndexedDB.");
      toast.warning("Local Configuration Missing", { description: "No app settings found in local storage." });
      return null;
    }
  } catch (error) {
    console.error("Error retrieving app configuration:", error);
    toast.error("Configuration Load Failed", { description: error instanceof Error ? error.message : String(error) });
    return null;
  }
}


// --- Existing Functions (modified for consistency with initDB pattern) ---

export async function updateDataPoint(nodeId: string, value: number | boolean) {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot update data point." });
    return;
  }
  try {
    await db.put('dataPoints', {
      timestamp: Date.now(),
      value,
    }, nodeId);
    // console.log(`DataPoint ${nodeId} updated in IDB.`);
  } catch (error) {
    console.error(`Error updating DataPoint ${nodeId} in IDB:`, error);
    toast.error("Data Point Update Failed", { description: `Could not save ${nodeId} locally.`});
  }
}

// Update getDataPoint in /lib/db.ts - This function doesn't use IndexedDB
// It seems to be a WebSocket fetcher. Keep as is.
export const getDataPoint = async (nodeId: string): Promise<{ value: any, timestamp?: number } | { value: string, error?: any }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      // Handle server-side or WebSocket unavailable scenarios
      console.warn('WebSocket is not available in this environment.');
      return reject({ value: 'Error Fetching Data', error: 'WebSocket unavailable' });
    }
    // Note: window.location.port might not be correct if your WS server is on a different port than HTTP server.
    // Assuming WS_PORT from constants is more reliable for the actual WebSocket server.
    // If the WS server runs on the same port as HTTP, window.location.port is fine.
    // Using a fixed WS_PORT here or dynamically figuring out the right port is crucial.
    // For now, sticking to user's code.
    const wsUrl = `ws://${window.location.hostname}:${window.location.port}/opcua/data`; 
    // Consider using WS_URL from constants if it's configured correctly for your setup.

    let ws: WebSocket;
    try {
       ws = new WebSocket(wsUrl);
    } catch (e) {
        console.error('WebSocket connection failed to initialize:', e);
        return reject({ value: 'Error Fetching Data', error: 'WebSocket initialization failed' });
    }
    
    const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CLOSING) {
            console.error('WebSocket connection timed out for', nodeId);
            ws.close(); // Attempt to close before rejecting
            reject({ value: 'Error Fetching Data', error: 'Connection timeout' });
        }
    }, 5000); // 5-second timeout

    ws.onopen = () => {
      ws.send(JSON.stringify({ nodeId }));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(event.data as string);
        if (data.error) {
          console.error(`WebSocket error for ${nodeId}:`, data.error);
          reject({ value: 'Error Fetching Data', error: data.error });
        } else {
          resolve(data);
        }
      } catch (e) {
        console.error(`Error parsing WebSocket message for ${nodeId}:`, e);
        reject({ value: 'Error Fetching Data', error: 'Invalid data format' });
      } finally {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error(`WebSocket error for ${nodeId}:`, error);
      reject({ value: 'Error Fetching Data', error });
       if (ws.readyState !== WebSocket.CLOSED) ws.close();
    };

    ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log(`WebSocket connection closed for ${nodeId}. Code: ${event.code}, Reason: ${event.reason}`);
        // Rejection/resolution should have happened in onmessage/onerror typically
    };
  });
};

export async function queueControlAction(nodeId: string, value: number | boolean) {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot queue control action." });
    return;
  }
  const actionKey = `${nodeId}-${Date.now()}`;
  try {
    await db.put('controlQueue', {
      nodeId,
      value,
      timestamp: Date.now(),
    }, actionKey);
    toast.info("Control Action Queued", { description: `${nodeId} will be set to ${value} when online.`});
  } catch (error) {
     console.error(`Error queuing control action ${actionKey} in IDB:`, error);
    toast.error("Control Action Queue Failed", { description: `Could not queue ${nodeId}.`});
  }
}

export async function getControlQueue() {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot retrieve control queue.");
    return [];
  }
  try {
    return await db.getAll('controlQueue');
  } catch (error) {
    console.error(`Error retrieving control queue from IDB:`, error);
    toast.error("Failed to Get Control Queue", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function clearControlQueue() {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot clear control queue.");
    return;
  }
  try {
    await db.clear('controlQueue');
    toast.success("Control Queue Cleared", { description: "All pending offline actions have been removed."});
  } catch (error) {
    console.error(`Error clearing control queue in IDB:`, error);
    toast.error("Failed to Clear Control Queue", { description: error instanceof Error ? error.message : String(error) });
  }
}

// Optional: A function to call on app startup to ensure config is saved
// You might want to call this in your main _app.tsx or a layout component useEffect.
export async function ensureAppConfigIsSaved() {
  if (typeof window === 'undefined') return;

  const storedConfig = await getAppConfig();
  if (!storedConfig || storedConfig.VERSION !== VERSION) {
    console.log(
      !storedConfig 
        ? "No local app configuration found, saving current." 
        : `Local app configuration version (${storedConfig.VERSION}) outdated, updating to ${VERSION}.`
    );
    await saveAppConfig();
  } else {
    console.log("Local app configuration is up-to-date.");
  }
}

// --- NotificationRule CRUD Functions ---

export async function addNotificationRule(rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot add notification rule." });
    throw new Error("Database not initialized");
  }
  const now = new Date();
  const newRule: NotificationRule = {
    ...rule,
    id: rule.id || uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.add('notificationRules', newRule);
    toast.success("Notification Rule Added", { description: `Rule "${newRule.name}" saved.` });
    return newRule.id;
  } catch (error) {
    console.error("Error adding notification rule:", error);
    toast.error("Notification Rule Add Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getNotificationRule(id: string): Promise<NotificationRule | undefined> {
  const db = await initDB();
  if (!db) {
    // No toast, might be called frequently or internally
    console.error("Database not ready, cannot get notification rule.");
    return undefined;
  }
  try {
    return await db.get('notificationRules', id);
  } catch (error) {
    console.error(`Error getting notification rule ${id}:`, error);
    toast.error("Notification Rule Fetch Failed", { description: error instanceof Error ? error.message : String(error) });
    return undefined;
  }
}

export async function getAllNotificationRules(): Promise<NotificationRule[]> {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot get all notification rules.");
    return [];
  }
  try {
    return await db.getAll('notificationRules');
  } catch (error) {
    console.error("Error getting all notification rules:", error);
    toast.error("Failed to Fetch Notification Rules", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function getEnabledNotificationRules(): Promise<NotificationRule[]> {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot get enabled notification rules.");
    return [];
  }
  try {
    return await db.getAllFromIndex('notificationRules', 'isEnabled', IDBKeyRange.only(1)); // Convert boolean true to number 1
  } catch (error) {
    console.error("Error getting enabled notification rules:", error);
    toast.error("Failed to Fetch Enabled Rules", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function updateNotificationRule(ruleUpdate: Partial<NotificationRule> & { id: string }): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot update notification rule." });
    throw new Error("Database not initialized");
  }
  try {
    const existingRule = await db.get('notificationRules', ruleUpdate.id);
    if (!existingRule) {
      throw new Error(`Notification rule with id ${ruleUpdate.id} not found.`);
    }
    const updatedRule = {
      ...existingRule,
      ...ruleUpdate,
      updatedAt: new Date(),
    };
    await db.put('notificationRules', updatedRule);
    toast.success("Notification Rule Updated", { description: `Rule "${updatedRule.name}" updated.` });
  } catch (error) {
    console.error("Error updating notification rule:", error);
    toast.error("Notification Rule Update Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function deleteNotificationRule(id: string): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot delete notification rule." });
    throw new Error("Database not initialized");
  }
  try {
    await db.delete('notificationRules', id);
    // Also delete associated active alarms
    await deleteActiveAlarmsByRuleId(id);
    toast.success("Notification Rule Deleted", { description: `Rule ${id} and associated alarms deleted.` });
  } catch (error) {
    console.error(`Error deleting notification rule ${id}:`, error);
    toast.error("Notification Rule Delete Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// --- ActiveAlarm CRUD Functions ---

export async function addActiveAlarm(alarm: Omit<ActiveAlarm, 'id' | 'triggeredAt' | 'lastNotifiedAt'> & { id?: string }): Promise<string> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot add active alarm." });
    throw new Error("Database not initialized");
  }
  const now = new Date();
  const newAlarm: ActiveAlarm = {
    ...alarm,
    id: alarm.id || uuidv4(),
    triggeredAt: now,
    lastNotifiedAt: now,
  };
  try {
    await db.add('activeAlarms', newAlarm);
    toast.info("New Active Alarm", { description: `Alarm for rule ${newAlarm.ruleId} triggered.` });
    return newAlarm.id;
  } catch (error) {
    console.error("Error adding active alarm:", error);
    toast.error("Active Alarm Add Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getActiveAlarm(id: string): Promise<ActiveAlarm | undefined> {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot get active alarm.");
    return undefined;
  }
  try {
    return await db.get('activeAlarms', id);
  } catch (error) {
    console.error(`Error getting active alarm ${id}:`, error);
    toast.error("Active Alarm Fetch Failed", { description: error instanceof Error ? error.message : String(error) });
    return undefined;
  }
}

export async function getAllActiveAlarms(): Promise<ActiveAlarm[]> {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot get all active alarms.");
    return [];
  }
  try {
    return await db.getAll('activeAlarms');
  } catch (error) {
    console.error("Error getting all active alarms:", error);
    toast.error("Failed to Fetch Active Alarms", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function getUnacknowledgedActiveAlarms(): Promise<ActiveAlarm[]> {
  const db = await initDB();
  if (!db) {
    console.error("Database not ready, cannot get unacknowledged active alarms.");
    return [];
  }
  try {
    return await db.getAllFromIndex('activeAlarms', 'acknowledged', IDBKeyRange.only(0)); // Convert boolean false to number 0
  } catch (error) {
    console.error("Error getting unacknowledged active alarms:", error);
    toast.error("Failed to Fetch Unacknowledged Alarms", { description: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function updateActiveAlarm(alarmUpdate: Partial<ActiveAlarm> & { id: string }): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot update active alarm." });
    throw new Error("Database not initialized");
  }
  try {
    const existingAlarm = await db.get('activeAlarms', alarmUpdate.id);
    if (!existingAlarm) {
      throw new Error(`Active alarm with id ${alarmUpdate.id} not found.`);
    }
    const updatedAlarm = {
      ...existingAlarm,
      ...alarmUpdate,
      // lastNotifiedAt could be updated here if the update is for a re-notification
    };
    await db.put('activeAlarms', updatedAlarm);
    toast.success("Active Alarm Updated", { description: `Alarm ${updatedAlarm.id} updated.` });
  } catch (error) {
    console.error("Error updating active alarm:", error);
    toast.error("Active Alarm Update Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function deleteActiveAlarm(id: string): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot delete active alarm." });
    throw new Error("Database not initialized");
  }
  try {
    await db.delete('activeAlarms', id);
    toast.success("Active Alarm Deleted", { description: `Alarm ${id} removed.` });
  } catch (error) {
    console.error(`Error deleting active alarm ${id}:`, error);
    toast.error("Active Alarm Delete Failed", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function deleteActiveAlarmsByRuleId(ruleId: string): Promise<void> {
  const db = await initDB();
  if (!db) {
    toast.error("Database Not Ready", { description: "Cannot delete active alarms by rule ID." });
    throw new Error("Database not initialized");
  }
  try {
    const tx = db.transaction('activeAlarms', 'readwrite');
    const index = tx.store.index('ruleId');
    let cursor = await index.openCursor(IDBKeyRange.only(ruleId));
    let deleteCount = 0;
    while (cursor) {
      await cursor.delete();
      deleteCount++;
      cursor = await cursor.continue();
    }
    await tx.done;
    if (deleteCount > 0) {
      toast.info("Associated Alarms Cleared", { description: `${deleteCount} active alarms for rule ${ruleId} deleted.` });
    }
    console.log(`Deleted ${deleteCount} active alarms for ruleId ${ruleId}`);
  } catch (error) {
    console.error(`Error deleting active alarms for ruleId ${ruleId}:`, error);
    toast.error("Failed to Delete Associated Alarms", { description: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}