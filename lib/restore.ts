import { SLDLayout, AppOnboardingData as ExpectedAppOnboardingData } from '@/types/index';
import { toast } from 'sonner';
import { saveOnboardingData as saveIdbOnboardingData, clearOnboardingData as clearIdbBeforeImport } from '@/lib/idb-store';
import { PLANT_NAME } from '@/config/constants';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
import { WEATHER_CARD_CONFIG_KEY, WEBSOCKET_CUSTOM_URL_KEY } from '@/config/constants';

const APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT = [
  'app-storage',
  'user',
  USER_DASHBOARD_CONFIG_KEY,
  'dashboardSoundEnabled',
  WEATHER_CARD_CONFIG_KEY,
  WEBSOCKET_CUSTOM_URL_KEY,
  // Consider 'theme' separately, usually user preference
];

export interface BackupFileContent {
  backupSchemaVersion: string;
  createdAt: string;
  application: { name: string; version: string };
  plant: { name: string; location: string; capacity: string };
  configurations?: { dataPointDefinitions?: any[] };
  userSettings?: { dashboardLayout?: any };
  browserStorage: {
    indexedDB?: { onboardingData?: ExpectedAppOnboardingData; };
    localStorage: Record<string, any>;
  };
  sldLayouts?: Record<string, SLDLayout | null>;
}

export async function restoreFromBackupContent(
  backupData: BackupFileContent,
  webSocket: { isConnected: boolean; connect: () => void; sendJsonMessage: (message: any) => void },
  logout: () => void,
  setProgress?: (message: string) => void
) {
  const importToastId = toast.loading("Importing data...");

  try {
    setProgress?.("Clearing local settings...");
    await new Promise(res => setTimeout(res, 200));
    APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.forEach(key => localStorage.removeItem(key));
    const currentTheme = localStorage.getItem('theme'); // Preserve theme
    if (currentTheme) localStorage.setItem('theme', currentTheme);

    setProgress?.("Restoring LocalStorage...");
    await new Promise(res => setTimeout(res, 200));
    if (backupData.browserStorage.localStorage) {
      console.log('Restoring localStorage data:', backupData.browserStorage.localStorage);
      for (const key in backupData.browserStorage.localStorage) {
        if (APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.includes(key) || key.startsWith('react-flow')) {
          const value = backupData.browserStorage.localStorage[key];
          console.log(`Restoring key: ${key}`, value);
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
    }
    toast.info("LocalStorage restored.", { id: importToastId });

    setProgress?.("Restoring Onboarding Data (IDB)...");
    await new Promise(res => setTimeout(res, 200));
    if (backupData.browserStorage.indexedDB?.onboardingData) {
      await clearIdbBeforeImport();
      const onboardingToSave = backupData.browserStorage.indexedDB.onboardingData as Omit<ExpectedAppOnboardingData, 'onboardingCompleted' | 'version'>;
      await saveIdbOnboardingData(onboardingToSave);
      toast.info("Onboarding data (IDB) restored.", { id: importToastId });
    } else {
      toast.warning("No onboarding data in backup to restore.", { id: importToastId });
    }

    if (backupData.sldLayouts && Object.keys(backupData.sldLayouts).length > 0) {
      setProgress?.("Restoring SLD layouts...");
      await new Promise(res => setTimeout(res, 200));
      if (!webSocket.isConnected) {
        toast.error("SLD Restore Failed: Not Connected", {
          id: importToastId,
          description: "The real-time server is not connected, so SLD layouts cannot be restored. Please check the connection and try again.",
          duration: 10000
        });
      } else {
        let sldSuccess = 0;
        Object.values(backupData.sldLayouts).forEach(layout => {
          if (layout) {
            webSocket.sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${layout.layoutId}`, layout } });
            sldSuccess++;
          }
        });
        if (sldSuccess > 0) {
          toast.info(`Sent ${sldSuccess} SLD layouts for restoration.`, { id: importToastId });
        }
      }
    } else {
      toast.info("No SLD layouts found in backup.", { id: importToastId });
    }

    setProgress?.("Finalizing...");
    await new Promise(res => setTimeout(res, 300));
    logout();
    toast.success("Import Complete! Reloading...", {
      id: importToastId, duration: 3000,
      onAutoClose: () => window.location.reload(), onDismiss: () => window.location.reload(),
    });

  } catch (error: any) {
    console.error("Import failed:", error);
    toast.error("Import Failed", { id: importToastId, description: error.message || String(error) });
    throw error; // Re-throw so the caller can handle it
  }
}
