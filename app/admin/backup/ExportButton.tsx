"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocketListener";
import { useEffect, useState } from "react";
import { SLDLayout } from "@/types/sld";
import { WeatherCardConfig, loadWeatherCardConfigFromStorage } from "@/app/control/WeatherCard";
import * as APP_CONFIG from "@/config/appConfig";
import { PLANT_NAME, PLANT_LOCATION, PLANT_CAPACITY, APP_NAME, VERSION, WEATHER_CARD_CONFIG_KEY } from "@/config/constants";


const EXPECTED_BACKUP_SCHEMA_VERSION = "2.0.0";

interface BackupFileContent {
  backupSchemaVersion: string;
  createdAt: string;
  application: { name: string; version: string };
  plant: { name: string; location: string; capacity: string };
  configurations?: Record<string, string>;
  userSettings?: { dashboardLayout?: any };
  browserStorage: {
    indexedDB?: any;
    localStorage: Record<string, any>;
  };
  sldLayouts?: Record<string, SLDLayout | null>;
}

export default function ExportButton() {
  const { sendJsonMessage, lastJsonMessage, isConnected, connect } = useWebSocket();
  const [isExporting, setIsExporting] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, SLDLayout>>({});

  useEffect(() => {
    if (lastJsonMessage) {
      const message = lastJsonMessage as any;
      if (message.type === 'all-sld-layouts') {
        setLayouts(message.payload);
      }
    }
  }, [lastJsonMessage]);

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Gathering data for backup...");

    try {
      if (!isConnected) {
        connect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      sendJsonMessage({ type: 'get-all-sld-layouts' });
      // The main export logic is now in the useEffect below, triggered by receiving layouts.
    } catch (error) {
      console.error("Error initiating export:", error);
      toast.error("Failed to start export process.", {
        description: (error as Error).message,
      });
      setIsExporting(false);
    }
  };

  useEffect(() => {
    // This effect triggers once the layouts have been successfully fetched OR if the export was started when layouts were already present.
    // It only runs when isExporting is true and layouts are available.
    if (isExporting && Object.keys(layouts).length > 0) {
      const exportData = async () => {
        try {
          // 1. Fetch all plant configuration files
          toast.info("Fetching all plant configuration files...");
          const configResponse = await fetch('/api/plant-configs');
          if (!configResponse.ok) {
            throw new Error(`Failed to fetch plant configs: ${configResponse.statusText}`);
          }
          const plantConfigs = await configResponse.json();
          toast.success("Successfully fetched all plant configurations.");

          // 2. Get Weather Card Config from localStorage
          const weatherCardConfig = loadWeatherCardConfigFromStorage();

          // 3. Get other relevant data from localStorage
          const localStorageData: Record<string, any> = {};
          const appStorage = localStorage.getItem('app-storage');
          if (appStorage) {
            localStorageData['app-storage'] = JSON.parse(appStorage);
          }
          localStorageData[WEATHER_CARD_CONFIG_KEY] = weatherCardConfig;

          // 4. Assemble backup file
          const backupData: BackupFileContent = {
            backupSchemaVersion: EXPECTED_BACKUP_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            application: {
              name: APP_NAME,
              version: VERSION,
            },
            plant: {
              name: PLANT_NAME,
              location: PLANT_LOCATION,
              capacity: PLANT_CAPACITY,
            },
            sldLayouts: layouts,
            configurations: plantConfigs,
            browserStorage: {
              localStorage: localStorageData,
            },
          };

          // 5. Trigger download
          const json = JSON.stringify(backupData, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `av-dashboard-backup-${timestamp}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success("System settings exported successfully.");
        } catch (error) {
          console.error("Error during export data assembly:", error);
          toast.error("Failed to export system settings.", {
            description: (error as Error).message,
          });
        } finally {
          setIsExporting(false);
          setLayouts({}); // Reset layouts for the next export
        }
      };

      exportData();
    }
  }, [isExporting, layouts]);

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export All Settings"}
    </Button>
  );
}
