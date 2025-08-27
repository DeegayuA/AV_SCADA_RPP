import { exportIdbData } from '@/lib/idb-store';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';
import { PLANT_NAME, PLANT_LOCATION, PLANT_CAPACITY, APP_NAME, VERSION, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';
import { SLDLayout } from '@/types/sld';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/appStore';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${PLANT_NAME || 'defaultPlant'}`;

const APP_LOCAL_STORAGE_KEYS = [
  USER_DASHBOARD_CONFIG_KEY,
  'user-preferences',
  'last-session',
  'theme',
  WEATHER_CARD_CONFIG_KEY,
  WEBSOCKET_CUSTOM_URL_KEY,
];

const SLD_LAYOUT_IDS_TO_BACKUP: string[] = ['main_plant'];

async function fetchAllSldLayouts(): Promise<Record<string, SLDLayout | null>> {
  if (SLD_LAYOUT_IDS_TO_BACKUP.length === 0) return {};

  const { isWebSocketConnected, requestWithResponse } = useAppStore.getState();
  if (!isWebSocketConnected || !requestWithResponse) {
    console.warn("Cannot fetch SLD layouts for backup: WebSocket not connected or request function unavailable.");
    return {};
  }

  const results = await Promise.allSettled(
    SLD_LAYOUT_IDS_TO_BACKUP.map(layoutId =>
      requestWithResponse<SLDLayout>({ type: 'get-layout', payload: { key: `sld_${layoutId}` } }, 5000)
    )
  );

  const sldDataForBackup: Record<string, SLDLayout | null> = {};
  results.forEach((result, index) => {
    const layoutId = SLD_LAYOUT_IDS_TO_BACKUP[index];
    if (result.status === 'fulfilled') {
      sldDataForBackup[layoutId] = result.value;
    } else {
      console.error(`Failed to fetch SLD layout "${layoutId}" for backup:`, result.reason);
      sldDataForBackup[layoutId] = null;
    }
  });

  return sldDataForBackup;
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

  const sldDataForBackup = await fetchAllSldLayouts();

  const now = new Date();
  const localTimeForFilename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

  const backupData = {
    backupSchemaVersion: "1.0.0",
    createdAt: now.toISOString(),
    createdBy: currentUser?.name || 'System', // Default to 'System' for periodic backups
    localTime: localTimeForFilename,
    application: { name: APP_NAME, version: VERSION },
    plant: { name: PLANT_NAME, location: PLANT_LOCATION, capacity: PLANT_CAPACITY },
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
