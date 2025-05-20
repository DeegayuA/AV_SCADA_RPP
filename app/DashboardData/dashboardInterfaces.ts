// In your dashboardInterfaces.ts or a similar shared types file
import { LucideIcon } from 'lucide-react';
import { DataPoint } from '@/config/dataPoints'; // Use the base DataPoint type

// Define DataPointCategory locally since it's not exported from dataPoints
export type DataPointCategory =
    | 'power'
    | 'energy'
    | 'voltage'
    | 'current'
    | 'frequency'
    | 'irradiance'
    | 'temperature'
    | 'moduleTemperature'
    | 'ambientTemperature'
    | 'windSpeed'
    | 'inverterEfficiency'
    | 'batteryStateOfCharge'
    | 'batteryVoltage'
    | 'batteryCurrent'
    | 'gridFeedIn'
    | 'gridConsumption'
    | 'pvGeneration'
    | 'dcPower'
    | 'acPower'
    | 'general'
    | 'other';
export interface NodeData {
    [nodeId: string]: string | number | boolean | null | 'Error' | undefined; // Added undefined as a possible value state
}

export interface ThreePhasePoints { // Defines the structure for points within a group
    a?: DataPoint;
    b?: DataPoint;
    c?: DataPoint;
}
export interface ThreePhaseGroupInfo {
    groupKey: string;
    title: string;
    points: {
        a?: DataPoint;
        b?: DataPoint;
        c?: DataPoint;
    };
    average?: DataPoint;
    unit?: string;
    total?: DataPoint;
    category?: 'energy' | 'grid' | 'control' | 'battery' | 'inverter' | 'pv';
    icon: LucideIcon;
    description?: string;
    uiType: 'display' | 'control';
    config?: DataPoint;
    originalIds: string[];
}
export interface CircularGaugeConfig {
    min?: number;
    max?: number;
    factor?: number;
    dataType?: string;
    nodeId: string;
}