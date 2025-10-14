export interface MaintenanceNote {
  id: string;
  timestamp: string;
  deviceId: string;
  itemNumber: number;
  tags: string[];
  text?: string;
  author: string;
  imageFilename?: string;
  isScheduledCheck: boolean;
}