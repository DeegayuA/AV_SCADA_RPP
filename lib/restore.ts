import { SLDLayout, AppOnboardingData as ExpectedAppOnboardingData } from '@/types/index';
import { toast } from 'sonner';
import { saveOnboardingData as saveIdbOnboardingData, clearOnboardingData as clearIdbBeforeImport } from '@/lib/idb-store';
import { PLANT_NAME } from '@/config/constants';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
const APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT = [
  'app-storage',
  'user',
  USER_DASHBOARD_CONFIG_KEY,
  'dashboardSoundEnabled',
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
      for (const key in backupData.browserStorage.localStorage) {
        if (APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.includes(key) || key.startsWith('react-flow')) {
          localStorage.setItem(key, JSON.stringify(backupData.browserStorage.localStorage[key]));
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
        toast.warning("WebSocket disconnected. Attempting connection...", { id: importToastId });
        webSocket.connect(); await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (webSocket.isConnected) {
        let sldSuccess = 0;
        Object.values(backupData.sldLayouts).forEach(layout => {
          if (layout) {
            webSocket.sendJsonMessage({ type: 'save-sld-widget-layout', payload: { key: `sld_${layout.layoutId}`, layout } });
            sldSuccess++;
          }
        });
        toast.info(`Sent ${sldSuccess} SLD layouts for restoration.`, { id: importToastId });
      } else {
        toast.error("SLD restore failed: WebSocket not connected.", { id: importToastId });
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
