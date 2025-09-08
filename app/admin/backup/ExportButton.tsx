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
  configurations?: { dataPointDefinitions?: any[] };
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
        setIsExporting(false);
        toast.success("Successfully fetched all SLD layouts.", {
          description: `Found ${Object.keys(message.payload).length} layouts. You can now export.`,
        });
      }
    }
  }, [lastJsonMessage]);

  const fetchLayouts = () => {
    if (!isConnected) {
      toast.info("Connecting to the server to fetch layouts...");
      connect();
    }
    setIsExporting(true);
    toast.info("Requesting all SLD layouts from the server...");
    sendJsonMessage({ type: 'get-all-sld-layouts' });
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Gathering data for backup...");

    try {
      // 1. Fetch SLD Layouts
      if (!isConnected) {
        connect();
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait for connection
      }
      sendJsonMessage({ type: 'get-all-sld-layouts' });

      // The rest of the export process will be triggered by the useEffect when layouts are received.
      // For now, we will just log a message.
      console.log("Waiting for layouts to be fetched...");


    } catch (error) {
      console.error("Error during export:", error);
      toast.error("Failed to export system settings.", {
        description: (error as Error).message,
      });
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (Object.keys(layouts).length > 0) {
      const exportData = async () => {
        // 2. Get Weather Card Config
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
        setIsExporting(false);
        setLayouts({}); // Reset layouts
      };

      exportData();
    }
  }, [layouts]);


  return (
    <Button onClick={handleExport} disabled={isExporting}>
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export All Settings"}
    </Button>
  );
}
