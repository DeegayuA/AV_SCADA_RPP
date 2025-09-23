export interface MaintenanceItem {
  id: string;
  name: string;
  quantity: number;
  timesPerDay: number;
  timeFrames: string;
  color?: string;
  timeWindow: number; // in minutes
}
