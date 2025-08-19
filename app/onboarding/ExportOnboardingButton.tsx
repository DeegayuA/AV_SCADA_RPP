"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useOnboarding } from "./OnboardingContext";
import { APP_NAME } from "@/config/constants";
import { PLANT_NAME, PLANT_LOCATION, PLANT_CAPACITY, VERSION } from "@/config/constants";

const EXPECTED_BACKUP_SCHEMA_VERSION = "2.0.0";

interface BackupFileContent {
  backupSchemaVersion: string;
  createdAt: string;
  application: { name: string; version: string };
  plant: { name: string; location: string; capacity: string };
  browserStorage: {
    indexedDB?: any;
    localStorage: Record<string, any>;
  };
}

export default function ExportOnboardingButton() {
  const { onboardingData } = useOnboarding();

  const handleExport = async () => {
    toast.info("Gathering data for backup...");

    try {
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
        browserStorage: {
          indexedDB: {
            onboardingData: onboardingData,
          },
          localStorage: {},
        },
      };

      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `av-dashboard-onboarding-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Onboarding data exported successfully.");
    } catch (error) {
      console.error("Error during export:", error);
      toast.error("Failed to export onboarding data.", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" />
      Export Onboarding Progress
    </Button>
  );
}
