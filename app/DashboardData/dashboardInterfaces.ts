// In your dashboardInterfaces.ts or a similar shared types file
import { LucideIcon } from 'lucide-react';
import { DataPoint } from '@/config/dataPoints'; // Use the base DataPoint type

export interface NodeData {
    [nodeId: string]: string | number | boolean | null | 'Error' | undefined; // Added undefined as a possible value state
}

export interface ThreePhasePoints { // Defines the structure for points within a group
    a?: DataPoint;
    b?: DataPoint;
    c?: DataPoint;
}

export interface ThreePhaseGroupInfo {
    groupKey: string;           // The unique key for this group (e.g., "grid-voltage-raw-display")
    title: string;              // User-friendly display title (e.g., "Grid Voltage")
    points: ThreePhasePoints;
    icon: LucideIcon;
    unit?: string;               // Common unit for the group (e.g., 'V', 'A')
    description?: string;
    uiType: 'display' | 'gauge';// How the group itself should be presented (if applicable, often its 'display')
    config: DataPoint;          // A representative DataPoint from the group for common properties like min/max if it's a gauge group
    average?: DataPoint;         // Optional: A DataPoint representing the average of the phases
    total?: DataPoint;           // Optional: A DataPoint representing the total of the phases
    // category might be useful here too, inherited from its constituent points
    category?: DataPoint['category']; 
}

// This seems like it might be redundant if DataPoint already contains min/max/factor etc.
// The config prop in ThreePhaseGroupInfo above (of type DataPoint) should provide this.
// However, if CircularGauge needs its own separate prop, keep it.
// For simplicity, I'm assuming the DataPoint's own min/max/factor are used by gauge components.
export interface CircularGaugeConfig {
    min?: number;
    max?: number;
    factor?: number;
    dataType?: string;
    nodeId: string;
}