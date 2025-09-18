import { SLDLayout } from '@/types/sld';
import * as appConstants from '@/config/constants';
import { getFormattedTimestamp } from '@/lib/timeUtils';
import { useAppStore } from '@/stores/appStore';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${appConstants.PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${appConstants.PLANT_NAME || 'defaultPlant'}`;

const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
  WEATHER_CARD_CONFIG_KEY,
  appConstants.WEBSOCKET_CUSTOM_URL_KEY,
  appConstants.GRAPH_SERIES_CONFIG_KEY,
];

// This is a simplified version of the function in app/reset/page.tsx
function getAllSldLayoutsFromStorage(): Record<string, SLDLayout> {
    const allLayouts: Record<string, SLDLayout> = {};
    const sldStoragePrefix = 'sldLayout_';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(sldStoragePrefix)) {
        try {
          const rawLayout = localStorage.getItem(key);
          if (rawLayout) {
            const parsedLayout = JSON.parse(rawLayout) as SLDLayout;
            if (parsedLayout?.layoutId) {
              allLayouts[parsedLayout.layoutId] = parsedLayout;
            }
          }
        } catch (error) {
          console.warn(`Could not parse SLD layout from localStorage for key: ${key}`, error);
        }
      }
    }
    return allLayouts;
}

import {
    initDB,
    getOnboardingData,
    getAllNotificationRules,
    getAppConfig,
} from './db';
import { toast } from 'sonner';
import { AppOnboardingData, NotificationRule } from '@/types';

export interface BackupFileContent {
    backupSchemaVersion: string;
    createdAt: string;
    createdBy?: string;
    localTime?: string;
    backupType?: 'manual' | 'auto-backup';
    application: { name: string; version: string };
    plant: { name: string; location: string; capacity: string };
    configurations?: Record<string, string>;
    userSettings?: { dashboardLayout?: any };
    browserStorage: {
      indexedDB?: {
        onboardingData?: AppOnboardingData;
        notificationRules?: NotificationRule[];
        appConfig?: any;
      };
      localStorage: Record<string, any>;
    };
    sldLayouts?: Record<string, SLDLayout | null>;
  }

  export interface RestoreSelection {
    ui: boolean;
    appSettings: boolean;
    sldLayouts: boolean;
    configurations: boolean;
  }

export async function exportAllDataForBackup(): Promise<any> {
    const { currentUser } = useAppStore.getState();

    // 1. Get data from IndexedDB
    const onboardingData = await getOnboardingData();
    const notificationRules = await getAllNotificationRules();
    const appConfig = await getAppConfig();

    // 2. Get data from localStorage
    const localStorageData: Record<string, any> = {};
    APP_LOCAL_STORAGE_KEYS.forEach(key => {
      const item = localStorage.getItem(key);
      if (item !== null) {
        try {
          localStorageData[key] = JSON.parse(item);
        } catch (e) {
          localStorageData[key] = item;
        }
      }
    });

    const sldDataForBackup = getAllSldLayoutsFromStorage();

    const now = new Date();
    const localTimeForFilename = getFormattedTimestamp();

    // 3. Assemble the backup object
    const backupData = {
      backupSchemaVersion: "3.0.0", // New version for the new structure
      createdAt: now.toISOString(),
      createdBy: currentUser?.name || 'System',
      localTime: localTimeForFilename,
      application: { name: appConstants.APP_NAME, version: appConstants.VERSION },
      plant: { name: appConstants.PLANT_NAME, location: appConstants.PLANT_LOCATION, capacity: appConstants.PLANT_CAPACITY },
      configurations: { dataPointDefinitions: rawDataPointsDefinitions },
      browserStorage: {
        indexedDB: {
          onboardingData,
          notificationRules,
          appConfig,
        },
        localStorage: localStorageData,
      },
      sldLayouts: sldDataForBackup,
    };

    return backupData;
}

export async function importDataFromBackup(backupData: any) {
    const db = await initDB();
    if (!db) {
        throw new Error("Database not available");
    }

    const tx = db.transaction(['onboardingData', 'notificationRules', 'appConfig'], 'readwrite');
    const onboardingStore = tx.objectStore('onboardingData');
    const notificationRulesStore = tx.objectStore('notificationRules');
    const appConfigStore = tx.objectStore('appConfig');

    // Clear existing data
    await onboardingStore.clear();
    await notificationRulesStore.clear();
    await appConfigStore.clear();

    // Restore IndexedDB data
    if (backupData.browserStorage?.indexedDB) {
        const idbData = backupData.browserStorage.indexedDB;
        if (idbData.onboardingData) {
            await onboardingStore.put(idbData.onboardingData, 'onboardingData');
        }
        if (idbData.notificationRules) {
            for (const rule of idbData.notificationRules) {
                await notificationRulesStore.add(rule);
            }
        }
        if (idbData.appConfig) {
            await appConfigStore.put(idbData.appConfig, 'mainConfiguration');
        }
    }

    // Restore localStorage data
    if (backupData.browserStorage?.localStorage) {
        for (const key in backupData.browserStorage.localStorage) {
            localStorage.setItem(key, JSON.stringify(backupData.browserStorage.localStorage[key]));
        }
    }

    // Restore SLD layouts
    if (backupData.sldLayouts) {
        for (const layoutId in backupData.sldLayouts) {
            localStorage.setItem(`sldLayout_${layoutId}`, JSON.stringify(backupData.sldLayouts[layoutId]));
        }
    }

    await tx.done;
    toast.success("Data restored successfully!");
}
