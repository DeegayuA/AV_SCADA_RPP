import { LucideIcon } from 'lucide-react';
import { DataPoint as DataPointConfig } from '@/config/dataPoints'; // Import the necessary interface

export interface NodeData {
    [nodeId: string]: string | number | boolean | null | 'Error';
}

export interface ThreePhaseGroupInfo {
    groupKey: string;
    title: string;
    points: {
        a?: DataPointConfig;
        b?: DataPointConfig;
        c?: DataPointConfig;
    };
    icon: LucideIcon;
    unit?: string;
    description?: string;
    uiType: 'display' | 'gauge';
    config: DataPointConfig; // Representative config for min/max/factor etc.
}

// Interface for the Circular Gauge config, extracted from page.tsx
export interface CircularGaugeConfig {
    min?: number;
    max?: number;
    factor?: number;
    dataType?: string;
    nodeId: string; // Keep nodeId for unique gradient IDs if needed, or maybe just config.id
    // Let's simplify - the config prop IS the DataPointConfig
}
