export type ApiType = "read-range" | "read-all" | "read-one";

export type ApiInstanceStatus = 'online' | 'offline' | 'error' | 'pending' | 'disabled';

export interface ApiInstanceConfig {
  url: string;
  status: ApiInstanceStatus;
  lastChecked?: string; // ISO string for date
  downtimeStart?: string; // ISO string for date
  currentDowntimeDuration?: string; // User-friendly duration string, e.g., "2h 15m"
  error?: string; // To store instance-specific errors
}

export interface ApiConfig {
  id: string; // UUID
  name: string;
  type: ApiType;
  localApi: ApiInstanceConfig;
  onlineApi: ApiInstanceConfig;
  nodeId?: string; // Required for read-one, read-range
  withFactor: boolean;
  isEnabled: boolean; // To easily enable/disable monitoring for this API entry
  lastError?: string; // Store last error message for troubleshooting
  category?: string; // Optional: for grouping or filtering
}

export interface ApiDowntimeEvent {
  id: string; // UUID for the event itself
  apiConfigId: string;
  urlType: 'local' | 'online';
  urlChecked: string;
  startTime: string; // ISO string for date
  endTime: string | null; // ISO string for date, or null if ongoing
  durationMinutes?: number; // Calculated when endTime is set
  acknowledged?: boolean;
}

// Example of a more detailed status object that could be derived in components
export interface DerivedApiStatus extends ApiConfig {
  overallStatus: ApiInstanceStatus; // 'online' if local or online is up, 'offline' if both down, 'error' if config issue
  activeUrl?: string; // The URL currently being used (local or online)
  activeUrlType?: 'local' | 'online';
}

export const API_MONITORING_CONFIG_KEY = 'apiMonitoringConfigs_v1';
export const API_MONITORING_DOWNTIME_KEY = 'apiMonitoringDowntimes_v1';
