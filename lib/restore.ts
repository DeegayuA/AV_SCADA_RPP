import { SLDLayout, AppOnboardingData as ExpectedAppOnboardingData } from '@/types/index';
import { toast } from 'sonner';
import { saveOnboardingData as saveIdbOnboardingData, clearOnboardingData as clearIdbBeforeImport } from '@/lib/idb-store';
import { initDB, closeDB, DB_NAME } from '@/lib/db';
import { PLANT_NAME } from '@/config/constants';

const IDB_STORE_DB_NAME = 'SolarMinigridDB'; // From lib/idb-store.ts
const USER_DASHBOARD_CONFIG_KEY = `userDashboardLayout_${PLANT_NAME.replace(/\s+/g, '_')}_v2`;
import { WEATHER_CARD_CONFIG_KEY, WEBSOCKET_CUSTOM_URL_KEY, GRAPH_SERIES_CONFIG_KEY } from '@/config/constants';

const CURRENT_BACKUP_SCHEMA_VERSION = "2.1.0";

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
  configurations?: Record<string, string>;
  userSettings?: { dashboardLayout?: any };
  browserStorage: {
    indexedDB?: { onboardingData?: ExpectedAppOnboardingData; };
    localStorage: Record<string, any>;
  };
  sldLayouts?: Record<string, SLDLayout | null>;
}

import { MaintenanceItem } from '@/types/maintenance';

export interface RestoreSelection {
  ui: boolean;
  appSettings: boolean;
  sldLayouts: boolean;
  configurations: boolean;
  maintenanceData?: boolean;
}

export async function restoreFromBackupContent(
  backupData: BackupFileContent & { maintenanceData?: { config: MaintenanceItem[], logs: any, images: any, previews: any } },
  webSocket: { isConnected: boolean; connect: () => void; sendJsonMessage: (message: any) => void },
  logout: () => void,
  setProgress?: (message: string) => void,
  selection?: RestoreSelection
) {
  const importToastId = toast.loading("Starting restore...");

  if (backupData.backupSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION) {
    toast.warning("Older Backup Version", {
      description: `You are restoring a backup from an older version (v${backupData.backupSchemaVersion}). Some new features may not be restored.`,
    });
  }

  const fullSelection: RestoreSelection = {
    ui: !!backupData.browserStorage?.localStorage,
    appSettings: !!backupData.browserStorage?.indexedDB,
    sldLayouts: !!backupData.sldLayouts && Object.keys(backupData.sldLayouts).length > 0,
    configurations: !!backupData.configurations,
    maintenanceData: !!backupData.maintenanceData,
  };

  const finalSelection = selection || fullSelection;
  const nothingIsSelected = Object.values(finalSelection).every(v => !v);

  if (nothingIsSelected) {
    toast.warning("Nothing selected to restore.", { id: importToastId });
    return;
  }

  try {
    // ---!! NEW: WIPE AND RECREATE DATABASE TO AVOID VERSION CONFLICTS !!---
    setProgress?.("Preparing database...");
    await closeDB(); // Ensure any existing connection is closed

    // Delete both databases
    const dbNames = [DB_NAME, IDB_STORE_DB_NAME];
    for (const dbName of dbNames) {
      await new Promise<void>((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
              console.log(`Database "${dbName}" deleted successfully.`);
              resolve();
          };
          deleteRequest.onerror = (event) => {
              console.error(`Error deleting database "${dbName}":`, event);
              reject(new Error(`Could not delete existing database: ${dbName}.`));
          };
          deleteRequest.onblocked = () => {
              console.error(`Database "${dbName}" delete blocked. Close other tabs.`);
              toast.error("Database Restore Blocked", { description: "Please close all other tabs with this application open and try again." });
              reject(new Error("Database delete operation was blocked."));
          };
      });
    }

    await initDB(); // Re-initialize with the latest schema
    toast.info("Database reset successfully.", { id: importToastId });
    // ---!! END NEW LOGIC !!---

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

    if (finalSelection.configurations && backupData.configurations) {
      setProgress?.("Restoring All Plant Configurations...");
      await new Promise(res => setTimeout(res, 200));
      try {
        const response = await fetch('/api/plant-configs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backupData.configurations),
        });

        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.message || 'Failed to restore plant configuration files.');
        }

        toast.info("All plant configurations restored.", { id: importToastId });
      } catch (error) {
        console.error("Failed to restore plant configuration files:", error);
        toast.error("Plant Configuration Restore Failed", { id: importToastId, description: (error as Error).message });
      }
    }

    if (finalSelection.maintenanceData && backupData.maintenanceData) {
      setProgress?.("Restoring Maintenance Data...");
      await new Promise(res => setTimeout(res, 200));
      try {
        const response = await fetch('/api/maintenance/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backupData.maintenanceData),
        });

        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.message || 'Failed to restore maintenance data.');
        }

        toast.info("Maintenance data restored.", { id: importToastId });
      } catch (error) {
        console.error("Failed to restore maintenance data:", error);
        toast.error("Maintenance Data Restore Failed", { id: importToastId, description: (error as Error).message });
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
