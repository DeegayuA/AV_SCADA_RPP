import { exportIdbData } from '@/lib/idb-store';
import { dataPoints as rawDataPointsDefinitions } from '@/config/dataPoints';
import { PLANT_NAME, PLANT_LOCATION, PLANT_CAPACITY, APP_NAME, VERSION, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';
import { SLDLayout } from '@/types/sld';
import { useWebSocket } from '@/hooks/useWebSocketListener';
import { toast } from 'sonner';

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

async function fetchAllSldLayouts(
  sendJsonMessage: (jsonMessage: any) => void,
  connectWebSocket: () => void,
  isConnected: boolean
): Promise<Record<string, SLDLayout | null>> {
  if (SLD_LAYOUT_IDS_TO_BACKUP.length === 0) return {};

  if (!isConnected) {
    connectWebSocket();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for connection
  }

  const collectedSldLayouts: Record<string, SLDLayout | null> = {};
  const promises = SLD_LAYOUT_IDS_TO_BACKUP.map(layoutId => {
    return new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        console.warn(`Timeout fetching SLD for backup: ${layoutId}`);
        collectedSldLayouts[layoutId] = null;
        resolve();
      }, 10000);

      const handleSldMessage = (message: any) => {
        const layoutKeyWithPrefix = message.payload?.key;
        if (!layoutKeyWithPrefix || !layoutKeyWithPrefix.startsWith('sld_')) return;
        const receivedSldLayoutId = layoutKeyWithPrefix.substring(4);

        if (receivedSldLayoutId === layoutId) {
          clearTimeout(timeout);
          if (message.type === 'layout-data') {
            collectedSldLayouts[layoutId] = message.payload.layout;
          } else {
            collectedSldLayouts[layoutId] = null;
          }
          // This is a simplified listener, assuming one message per layout request
          // In a real scenario, you'd need a more robust way to correlate requests and responses.
          // For this script, we'll assume the WebSocket hook handles this correlation.
          resolve();
        }
      };

      // This is a conceptual implementation. The actual WebSocket message handling
      // is managed by the useWebSocket hook, which isn't directly accessible here.
      // A refactor would be needed to share the message handling logic.
      // For now, we will rely on the hook's existing message handling and
      // just send the request. This is a simplification.
      sendJsonMessage({ type: 'get-layout', payload: { key: `sld_${layoutId}` } });

      // The logic to wait for the response needs to be handled outside this function,
      // typically in a useEffect hook that can listen to `lastJsonMessage`.
      // This function is not a complete solution for fetching SLDs without a major refactor.
      // We will proceed with this simplified version for now.
      // A more robust solution would be to refactor the WebSocket logic to be reusable outside of a React component.

      // For this script, we will assume a simplified flow and proceed.
      // We will need to address this limitation.
      // Let's assume for now that the SLD fetching part will be handled by the component that calls this.
      // This is a placeholder for the actual implementation.
      resolve();
    });
  });

  await Promise.all(promises);
  return collectedSldLayouts;
}


export async function getBackupData(): Promise<any> {
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

  // Fetching SLD layouts is problematic here as it depends on a React hook (useWebSocket).
  // This function is designed to be called from a non-component context (a periodic timer),
  // so we cannot use hooks here.
  // For now, we will skip backing up SLD layouts in the periodic backup.
  // This is a limitation that needs to be addressed, potentially by refactoring the WebSocket logic.
  const sldDataForBackup = {};

  const backupData = {
    backupSchemaVersion: "1.0.0",
    createdAt: new Date().toISOString(),
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
