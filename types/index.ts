// Example in @/types/index.ts (or wherever UserRole, SLDLayout are)

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// export interface SLDNodeData { /* ... your SLDNodeData definition ... */ }
// export interface SLDFlowEdgeData { /* ... your SLDFlowEdgeData definition ... */ }
// // ... other SLD types (CustomNodeType, CustomFlowEdge)

export interface SLDLayout {
  layoutId: string;
  nodes: any[]; // Replace with your actual CustomNodeType[]
  edges: any[]; // Replace with your actual CustomFlowEdge[]
  viewport?: any; // Replace with your actual Viewport type from ReactFlow
}

// This should be the exact structure stored in IDB by `lib/idb-store.ts`
export interface AppOnboardingData {
  plantName: string;
  plantLocation: string;
  plantType: string;
  plantCapacity: string;
  opcUaEndpointOffline: string;
  opcUaEndpointOnline?: string;
  appName?: string;
  configuredDataPoints: any[]; // Replace with your DataPointConfig[] type
  onboardingCompleted: boolean;
  version: string;
}

export * from './notifications';
export * from './weather';

// --- Weather Card Configuration ---
export interface ConfiguredOpcUaItem {
  definitionId: string;
  opcUaNodeId?: string;
  label?: string;
  unit?: string;
  iconName?: string;
}

export interface WeatherCardConfig {
  opcUaItems: ConfiguredOpcUaItem[];
  forecastApiKey?: string;
  forecastCityName?: string;
  showForecast: boolean;
  showHourlyForecast: boolean;
  showDailySummary: boolean;
  showAirPollution: boolean;
  numOpcSensorsToShow: number;
  numHourlyForecastsToShow: number;
  numDailyForecastsToShow: number;
  enabled?: boolean;
}

export interface ScheduledEmail {
    id: string;
    subject: string;
    message: string;
    rate: number;
    currency: string;
    roles: string[];
}