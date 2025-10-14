export interface MaintenanceNote {
  id: string;
  timestamp: string;
  deviceId: string;
  tags: string[];
  text?: string;
  author: string;
}