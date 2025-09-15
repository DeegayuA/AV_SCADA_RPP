import { exportIdbData } from '@/lib/idb-store';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';
import * as appConstants from '@/config/constants';
import { sldLayouts as constantSldLayouts } from '@/config/sldLayouts';
import { GRAPH_SERIES_CONFIG_KEY } from '@/config/constants';
import { SLDLayout } from '@/types/sld';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/appStore';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${appConstants.PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${appConstants.PLANT_NAME || 'defaultPlant'}`;

const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
  WEATHER_CARD_CONFIG_KEY,
  appConstants.WEBSOCKET_CUSTOM_URL_KEY,
  GRAPH_SERIES_CONFIG_KEY,
];

function getAllSldLayoutsFromStorage(): Record<string, SLDLayout> {
  const allLayouts: Record<string, SLDLayout> = JSON.parse(JSON.stringify(constantSldLayouts));
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


export async function getBackupData(): Promise<any> {
  const { currentUser } = useAppStore.getState();
  const idbData = await exportIdbData();
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
  const localTimeForFilename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

  const backupData = {
    backupSchemaVersion: "2.0.0",
    createdAt: now.toISOString(),
    createdBy: currentUser?.name || 'System', // Default to 'System' for periodic backups
    localTime: localTimeForFilename,
    application: { name: appConstants.APP_NAME, version: appConstants.VERSION },
    plant: { name: appConstants.PLANT_NAME, location: appConstants.PLANT_LOCATION, capacity: appConstants.PLANT_CAPACITY },
    configurations: { dataPointDefinitions: rawDataPointsDefinitions },
    browserStorage: { indexedDB: idbData, localStorage: localStorageData },
    sldLayouts: sldDataForBackup,
  };

  return backupData;
}

export async function syncBackupToServer() {
  try {
    const backupData = await getBackupData();
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to sync backup to server');
    }

    const result = await response.json();
    console.log('Backup synced to server:', result.filename);
    toast.info('Automatic backup created', { description: `Backup file ${result.filename} saved on the server.` });
  } catch (error) {
    console.error('Error syncing backup to server:', error);
    toast.error('Automatic backup failed', { description: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}
