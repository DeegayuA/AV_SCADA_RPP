import { SLDLayout, AppOnboardingData as ExpectedAppOnboardingData } from '@/types/index';
import { toast } from 'sonner';
import { saveOnboardingData as saveIdbOnboardingData, clearOnboardingData as clearIdbBeforeImport } from '@/lib/idb-store';
import { PLANT_NAME } from '@/config/constants';

const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
import { WEATHER_CARD_CONFIG_KEY, WEBSOCKET_CUSTOM_URL_KEY, GRAPH_SERIES_CONFIG_KEY } from '@/config/constants';

// Define legacy graph keys here to avoid circular dependency
const PAGE_SLUG_FOR_GRAPH = 'control_dashboard';
const LEGACY_GRAPH_CONFIG_KEY_PREFIX = `powerGraphConfig_${PLANT_NAME.replace(/\s+/g, '_')}_${PAGE_SLUG_FOR_GRAPH}`;
const LEGACY_GRAPH_GEN_KEY = `${LEGACY_GRAPH_CONFIG_KEY_PREFIX}_generationDpIds`;
const LEGACY_GRAPH_USAGE_KEY = `${LEGACY_GRAPH_CONFIG_KEY_PREFIX}_usageDpIds`;
const LEGACY_GRAPH_EXPORT_KEY = `${LEGACY_GRAPH_CONFIG_KEY_PREFIX}_exportDpIds`;
const LEGACY_GRAPH_EXPORT_MODE_KEY = `${LEGACY_GRAPH_CONFIG_KEY_PREFIX}_exportMode`;
const LEGACY_GRAPH_WIND_KEY = `${LEGACY_GRAPH_CONFIG_KEY_PREFIX}_windDpIds`;

const APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT = [
  'app-storage',
  'user',
  USER_DASHBOARD_CONFIG_KEY,
  'dashboardSoundEnabled',
  WEATHER_CARD_CONFIG_KEY,
  WEBSOCKET_CUSTOM_URL_KEY,
  GRAPH_SERIES_CONFIG_KEY,
  // Add legacy keys to ensure they are included in backups for backward compatibility
  LEGACY_GRAPH_GEN_KEY,
  LEGACY_GRAPH_USAGE_KEY,
  LEGACY_GRAPH_EXPORT_KEY,
  LEGACY_GRAPH_EXPORT_MODE_KEY,
  LEGACY_GRAPH_WIND_KEY,
  // Consider 'theme' separately, usually user preference
];

export interface BackupFileContent {
  backupSchemaVersion: string;
  createdAt: string;
  createdBy?: string;
  localTime?: string;
  backupType?: 'manual' | 'auto-backup';
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

export interface RestoreSelection {
  ui: boolean;
  appSettings: boolean;
  sldLayouts: boolean;
}

export async function restoreFromBackupContent(
  backupData: BackupFileContent,
  webSocket: { isConnected: boolean; connect: () => void; sendJsonMessage: (message: any) => void },
  logout: () => void,
  setProgress?: (message: string) => void,
  selection?: RestoreSelection
) {
  const importToastId = toast.loading("Starting restore...");

  const fullSelection: RestoreSelection = {
    ui: !!backupData.browserStorage?.localStorage,
    appSettings: !!backupData.browserStorage?.indexedDB,
    sldLayouts: !!backupData.sldLayouts && Object.keys(backupData.sldLayouts).length > 0,
  };

  const finalSelection = selection || fullSelection;
  const nothingIsSelected = Object.values(finalSelection).every(v => !v);

  if (nothingIsSelected) {
    toast.warning("Nothing selected to restore.", { id: importToastId });
    return;
  }


  try {
    if (finalSelection.ui && backupData.browserStorage.localStorage) {
      setProgress?.("Restoring UI & Preferences...");
      await new Promise(res => setTimeout(res, 200));

      APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.forEach(key => localStorage.removeItem(key));
      const currentTheme = localStorage.getItem('theme'); // Preserve theme
      if (currentTheme) localStorage.setItem('theme', currentTheme);

      for (const key in backupData.browserStorage.localStorage) {
        if (APP_LOCAL_STORAGE_KEYS_TO_MANAGE_ON_IMPORT.includes(key) || key.startsWith('react-flow')) {
          const value = backupData.browserStorage.localStorage[key];
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
      toast.info("UI & Preferences restored.", { id: importToastId });
    }

    if (finalSelection.appSettings && backupData.browserStorage.indexedDB?.onboardingData) {
      setProgress?.("Restoring App Settings (IDB)...");
      await new Promise(res => setTimeout(res, 200));
      await clearIdbBeforeImport();
      const onboardingToSave = backupData.browserStorage.indexedDB.onboardingData as Omit<ExpectedAppOnboardingData, 'onboardingCompleted' | 'version'>;
      await saveIdbOnboardingData(onboardingToSave);
      toast.info("App Settings (IDB) restored.", { id: importToastId });
    }

    if (finalSelection.sldLayouts && backupData.sldLayouts && Object.keys(backupData.sldLayouts).length > 0) {
      setProgress?.("Restoring SLD layouts...");
      await new Promise(res => setTimeout(res, 200));
      try {
        let sldSuccess = 0;
        Object.values(backupData.sldLayouts).forEach(layout => {
          if (layout && layout.layoutId) {
            const key = `sldLayout_${layout.layoutId}`;
            localStorage.setItem(key, JSON.stringify(layout));
            sldSuccess++;
          }
        });
        if (sldSuccess > 0) {
          toast.info(`${sldSuccess} SLD layouts restored to local storage.`, { id: importToastId });
        }
      } catch (error) {
        console.error("Failed to restore SLD layouts to localStorage:", error);
        toast.error("SLD Restore Failed", { id: importToastId, description: "Could not save SLD layouts to local storage." });
      }
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
