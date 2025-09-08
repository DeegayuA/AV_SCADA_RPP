// Import React for component types
import React from 'react';
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon type
import {
  // Keep specific icons used
  Battery, Zap, Activity, Gauge, AudioWaveform, Thermometer, Clock, Percent,
  Power, ToggleLeft, ToggleRight, AlertTriangle, Settings, Sigma, Waves,
  Minimize2, Maximize2, FileOutput, Waypoints, Info, SigmaSquare, Lightbulb, HelpCircle,
  // LucideProps is implicitly handled by LucideIcon, but keeping explicit import if other code uses it
  LucideProps
} from 'lucide-react';

// Define a precise type for the icon components (as used in current file, part of the union for DataPoint.icon)
export type IconComponentType = React.FC<React.SVGProps<SVGSVGElement>>;

// THIS IS THE NEW LAYOUT FOR DataPoint AS REQUESTED
export interface DataPoint {
  label: string;
  id: string;
  name: string;
  nodeId: string;
  dataType:
  | 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32'
  | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte'
  | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText';
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input';
  icon?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>> | string; // Allow string for legacy support, but prefer LucideIcon or React component
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number; // Typically for display formatting, used by formatValue util
  isWritable?: boolean;
  decimalPlaces?: number; // Can be synonymous with precision for formatting
  enumSet?: Record<number | string, string>;
}


// --- The following interfaces are from the original file and are kept as is ---
export interface DataPointConfig {
  id: string;
  label: string;
  name: string;
  nodeId: string;
  dataType:
  | 'Boolean'
  | 'Float'
  | 'Double'
  | 'Int16'
  | 'Int32'
  | 'UInt16'
  | 'UInt32'
  | 'String'
  | 'DateTime'
  | 'ByteString'
  | 'Guid'
  | 'Byte'
  | 'SByte'
  | 'Int64'
  | 'UInt64';
  uiType: 'display' | 'button' | 'switch' | 'gauge';
  icon: IconComponentType; 
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase' | 'pv' | 'settings' | 'status' | 'energy' | string; 
  factor?: number;
  phase?: 'a' | 'b' | 'c' | 'x';
  isSinglePhase?: boolean;
  threePhaseGroup?: string;
  notes?: string;
}

export interface ThreePhasePointsConfig {
    a?: DataPointConfig;
    b?: DataPointConfig;
    c?: DataPointConfig;
}

export interface ThreePhaseDisplayGroup {
    groupName: string;
    uiType: 'display' | 'gauge';
    points: ThreePhasePointsConfig;
    average?: DataPointConfig;
    total?: DataPointConfig;
    category: string;
    id?: string;
}

// Helper function for creating kebab-case IDs
const createId = (name: string): string => {
  if (typeof name !== 'string' || !name) {
    return ''; 
  }
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^a-z0-9-_]+/g, '') 
    .replace(/^-+|-+$/g, '') 
    .replace(/-{2,}/g, '-'); 
};

// Define an extended type for internal use in this file to accommodate existing fields
// not present in the strictly defined `DataPoint` interface.
// This ensures type safety within this file and allows `dataPoints` to be assignable
// to `DataPoint[]` externally.
type ExtendedDataPoint = DataPoint & {
  phase?: 'a' | 'b' | 'c' | 'x';
  isSinglePhase?: boolean;
  threePhaseGroup?: string;
  notes?: string;
  // decimalPlaces is in DataPoint, no need to repeat here.
};


export const dataPoints: ExtendedDataPoint[] = [
  // --- Index 0 ---
  {
    id: 'power-on-voltage',
    name: 'Power On Voltage',
    nodeId: 'ns=4;i=3',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Minimum voltage required for inverter power on.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    notes: 'Factor 0.1 assumed for V scaling.',
    label: '',
    isWritable: true,
  },
  // --- Index 1 ---
  {
    id: 'reconnecting-time',
    name: 'Reconnecting Time',
    nodeId: 'ns=4;i=4',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    unit: 's',
    description: 'Delay time in seconds before reconnecting after a grid fault.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 2 ---
  {
    id: 'lower-limit-grid-voltage',
    name: 'Lower Limit Grid Voltage',
    nodeId: 'ns=4;i=5',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'V',
    description: 'Lower voltage limit setting for grid connection.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 3 ---
  {
    id: 'upper-limit-grid-voltage-1',
    name: 'Upper Limit Grid Voltage 1',
    nodeId: 'ns=4;i=6',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'V',
    description: 'Upper voltage limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 4 ---
  {
    id: 'lower-limit-grid-frequency',
    name: 'Lower Limit Grid Frequency',
    nodeId: 'ns=4;i=7',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'Hz',
    description: 'Lower frequency limit setting for grid connection.',
    category: 'settings',
    factor: 0.01,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 5 ---
  {
    id: 'upper-limit-grid-frequency-1',
    name: 'Upper Limit Grid Frequency 1',
    nodeId: 'ns=4;i=8',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'Hz',
    description: 'Upper frequency limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.01,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 6 ---
  {
    id: 'device-rtc-year-month',
    name: 'Device RTC Year/Month',
    nodeId: 'ns=4;i=10',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Year and Month (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic (e.g., High Byte = Year, Low Byte = Month). RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  // --- Index 7 ---
  {
    id: 'device-rtc-day-hour',
    name: 'Device RTC Day/Hour',
    nodeId: 'ns=4;i=11',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Day and Hour (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic. RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  // --- Index 8 ---
  {
    id: 'device-rtc-minute-second',
    name: 'Device RTC Minute/Second',
    nodeId: 'ns=4;i=12',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Minute and Second (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic. RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  {
    id: 'power-on-voltage',
    name: 'Power On Voltage',
    nodeId: 'ns=4;i=3',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Minimum voltage required for inverter power on.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    notes: 'Factor 0.1 assumed for V scaling.',
    label: '',
    isWritable: true,
  },
  // --- Index 1 ---
  {
    id: 'reconnecting-time',
    name: 'Reconnecting Time',
    nodeId: 'ns=4;i=4',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    unit: 's',
    description: 'Delay time in seconds before reconnecting after a grid fault.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 2 ---
  {
    id: 'lower-limit-grid-voltage',
    name: 'Lower Limit Grid Voltage',
    nodeId: 'ns=4;i=5',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'V',
    description: 'Lower voltage limit setting for grid connection.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 3 ---
  {
    id: 'upper-limit-grid-voltage-1',
    name: 'Upper Limit Grid Voltage 1',
    nodeId: 'ns=4;i=6',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'V',
    description: 'Upper voltage limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 4 ---
  {
    id: 'lower-limit-grid-frequency',
    name: 'Lower Limit Grid Frequency',
    nodeId: 'ns=4;i=7',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'Hz',
    description: 'Lower frequency limit setting for grid connection.',
    category: 'settings',
    factor: 0.01,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 5 ---
  {
    id: 'upper-limit-grid-frequency-1',
    name: 'Upper Limit Grid Frequency 1',
    nodeId: 'ns=4;i=8',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'Hz',
    description: 'Upper frequency limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.01,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 6 ---
  {
    id: 'device-rtc-year-month',
    name: 'Device RTC Year/Month',
    nodeId: 'ns=4;i=10',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Year and Month (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic (e.g., High Byte = Year, Low Byte = Month). RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  // --- Index 7 ---
  {
    id: 'device-rtc-day-hour',
    name: 'Device RTC Day/Hour',
    nodeId: 'ns=4;i=11',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Day and Hour (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic. RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  // --- Index 8 ---
  {
    id: 'device-rtc-minute-second',
    name: 'Device RTC Minute/Second',
    nodeId: 'ns=4;i=12',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Minute and Second (encoded). Value needs decoding.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs specific decoding logic. RTC setting likely writable.',
    label: '',
    isWritable: true,
  },
  
  // --- Index 9 ---
  {
    id: 'active-power-adjust',
    name: 'Active Power Adjust',
    nodeId: 'ns=4;i=14',
    dataType: 'Int16',
    uiType: 'input', // Changed to 'input'
    icon: Settings,
    unit: '%',
    description: 'Active power output adjustment setting. Target range 0-100%.', // Updated description
    category: 'control',
    factor: 0.1, // Raw value 1000 means 100.0%
    min: 0,      // Raw min for 0%
    max: 1000,   // Raw max for 100%
    precision: 1, // For display formatting
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 10 ---
  {
    id: 'pf-reactive-power-adjust',
    name: 'PF Reactive Power Adjust',
    nodeId: 'ns=4;i=15',
    dataType: 'Int16',
    uiType: 'input', // Changed to 'input'
    icon: Settings,
    unit: '', // PF is unitless
    description: 'Power Factor adjustment setting. Target range -1.000 to 1.000.', // Updated description
    category: 'control',
    factor: 0.001, // Raw value 1000 means PF 1.000
    min: -1000,    // Raw min for PF -1.000
    max: 1000,     // Raw max for PF 1.000
    precision: 3,  // For display formatting
    phase: 'x',
    notes: 'Factor 0.001 for PF (e.g., raw 995 -> PF 0.995).',
    label: '',
    isWritable: true,
  },
  // --- Index 11 ---
  {
    id: 'reactive-power-adjust',
    name: 'Reactive Power Adjust',
    nodeId: 'ns=4;i=16',
    dataType: 'Float', 
    uiType: 'display', 
    icon: Settings,
    unit: 'VAR',
    description: 'Reactive power output adjustment setting (absolute VAR).',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 12 ---
  {
    id: 'max-value-of-reactive-power',
    name: 'Max Value of Reactive Power',
    nodeId: 'ns=4;i=17',
    dataType: 'Float', 
    uiType: 'display',
    icon: Maximize2,
    unit: 'VAR',
    description: 'Maximum allowed reactive power setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 13 ---
  {
    id: 'on-grid-export-power-limit-switch',
    name: 'On Grid Export Power Limit Switch',
    nodeId: 'ns=4;i=19',
    dataType: 'UInt16', 
    uiType: 'switch',
    icon: ToggleRight, 
    description: 'Enable/Disable the grid export power limitation feature.',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 11 ---
  {
    id: 'reactive-power-adjust',
    name: 'Reactive Power Adjust',
    nodeId: 'ns=4;i=16',
    dataType: 'Float', 
    uiType: 'display', 
    icon: Settings,
    unit: 'VAR',
    description: 'Reactive power output adjustment setting (absolute VAR).',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 12 ---
  {
    id: 'max-value-of-reactive-power',
    name: 'Max Value of Reactive Power',
    nodeId: 'ns=4;i=17',
    dataType: 'Float', 
    uiType: 'display',
    icon: Maximize2,
    unit: 'VAR',
    description: 'Maximum allowed reactive power setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 13 ---
  {
    id: 'on-grid-export-power-limit-switch',
    name: 'On Grid Export Power Limit Switch',
    nodeId: 'ns=4;i=19',
    dataType: 'UInt16', 
    uiType: 'switch',
    icon: ToggleRight, 
    description: 'Enable/Disable the grid export power limitation feature.',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 14 ---
  {
    id: 'export-power-percentage',
    name: 'Export Power Percentage',
    nodeId: 'ns=4;i=20',
    dataType: 'Int16',
    uiType: 'input', // Changed to 'input'
    icon: Percent,
    unit: '%',
    description: 'Set the export power limit as a percentage of rated power. Target range 0-100%.', // Updated description
    category: 'control',
    factor: 0.1,  // Raw value 1000 means 100.0%
    min: 0,       // Raw min for 0%
    max: 1000,    // Raw max for 100%
    precision: 1, // For display formatting
    phase: 'x',
    label: '',
    isWritable: true,
  },
  // --- Index 15 ---
  {
    id: 'export-power-percentage-1',
    name: 'Export Power Percentage_1',
    nodeId: 'ns=4;i=21',
    dataType: 'Int16',
    uiType: 'display',
    icon: Percent,
    unit: '%',
    description: 'Alternative setting for export power limit percentage.',
    category: 'control',
    factor: 0.1,
    phase: 'x',
    notes: 'Purpose of _1 unclear, possibly alternative/redundant setting.',
    label: '',
    isWritable: true,
  },
  // --- Index 16 ---
  {
    id: 'error-message',
    name: 'Error Message Code',
    nodeId: 'ns=4;i=22',
    dataType: 'Int16', 
    uiType: 'display',
    icon: AlertTriangle,
    description: 'Current device error code. Value requires a lookup table for description.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Error code; needs interpretation via documentation or lookup table.',
    label: '',
    isWritable: false,
  },
  // --- Index 17 & 18: Total Power Generation (32-bit combined) ---
  {
    id: 'high-byte-total-power-generation',
    name: 'High Word Total Power Generation',
    nodeId: 'ns=4;i=24',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Sigma,
    description: 'High word of the total generated power. Combine with low word (ns=4;i=25).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: '',
    isWritable: false,
  },
  {
    id: 'low-byte-total-power-generation',
    name: 'Low Word Total Power Generation',
    nodeId: 'ns=4;i=25',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Sigma,
    description: 'Low word of the total generated power. Combine with high word (ns=4;i=24).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: '',
    isWritable: false,
  },
  // --- Index 19 & 20: Hourly Power Generation (32-bit combined) ---
  {
    id: 'high-byte-hourly-power-generation',
    name: 'High Word Hourly Power Generation',
    nodeId: 'ns=4;i=26',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap, 
    description: 'High word of the energy generated in the current hour. Combine with low word (ns=4;i=27).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD (likely Wh or kWh).',
    label: '',
    isWritable: false,
  },
  {
    id: 'low-byte-hourly-power-generation',
    name: 'Low Word Hourly Power Generation',
    nodeId: 'ns=4;i=27',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Zap,
    description: 'Low word of the energy generated in the current hour. Combine with high word (ns=4;i=26).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor TBD.',
    label: '',
    isWritable: false,
  },
  // --- Index 21 to 24: PV Inputs ---
  {
    id: 'vpv1',
    name: 'PV1 Input Voltage',
    nodeId: 'ns=4;i=28',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 1.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'vpv2',
    name: 'PV2 Input Voltage',
    nodeId: 'ns=4;i=29',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 2.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'ipv1',
    name: 'PV1 Input Current',
    nodeId: 'ns=4;i=30',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Input current from PV string 1.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'ipv2',
    name: 'PV2 Input Current',
    nodeId: 'ns=4;i=31',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Input current from PV string 2.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  // --- Index 25 to 33: Grid AC Measurements (Raw) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `vac${idx + 1}`,
    name: `L${idx + 1} Phase Voltage (Raw)`,
    nodeId: `ns=4;i=${32 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves,
    unit: 'V',
    description: `Grid voltage of phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.1,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `iac${idx + 1}`,
    name: `L${idx + 1} Phase Current (Raw)`,
    nodeId: `ns=4;i=${35 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves,
    unit: 'A',
    description: `Grid current of phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.1,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `fac${idx + 1}`,
    name: `L${idx + 1} Phase Frequency (Raw)`,
    nodeId: `ns=4;i=${38 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: AudioWaveform,
    unit: 'Hz',
    description: `Grid frequency measured on phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.01,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: '',
    isWritable: false,
  })),
  // --- Remaining items ---
  {
    id: 'pac-l-inverter-power',
    name: 'Inverter Active Power Output (Pac)',
    nodeId: 'ns=4;i=41',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total active power output from the inverter.',
    category: 'inverter',
    factor: 1, 
    phase: 'x',
    notes: 'Original name "Pac L / inverter current" was ambiguous. Assumed Power output.',
    label: '',
    isWritable: false,
  },
  {
    id: 'work-mode-status',
    name: 'Work Mode Status Code',
    nodeId: 'ns=4;i=42',
    dataType: 'Int16',
    uiType: 'display',
    icon: Info,
    description: 'Current inverter work mode status code. Requires lookup table for description.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value needs interpretation via documentation or lookup table.',
    label: '',
    isWritable: false,
  },
  {
    id: 'inverter-internal-temperature',
    name: 'Inverter Internal Temperature',
    nodeId: 'ns=4;i=43',
    dataType: 'Int16',
    uiType: 'display', 
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature measured inside the inverter.',
    category: 'inverter',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'e-day-daily-power-generation',
    name: 'Daily Power Generation (E-day)',
    nodeId: 'ns=4;i=44',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'kWh',
    description: 'Total energy generated by the inverter today.',
    category: 'energy',
    factor: 0.1, 
    phase: 'x',
    notes: 'Factor 0.1 for kWh assumes raw value like 123 means 12.3 kWh. Verify unit.',
    label: '',
    isWritable: false,
  },
  // --- Precise AC Measurements (i=46 to i=64) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid${idx + 1}-i-precise`),
    name: `Grid Current L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${46 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'A',
    description: `Grid current of phase L${idx + 1} (high precision). Value scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-current-precise',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-v-l${idx + 1}-precise`),
    name: `Grid Voltage L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${49 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Grid voltage of phase L${idx + 1} (high precision). Value scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`limit${idx + 1}-i-precise`), // Limit current implies it could be a setting or a measurement of a set limit.
    name: `Limit Current L${idx + 1} (Precise)`, // Name suggests setting. If it IS a setting, should be writable.
    nodeId: `ns=4;i=${52 + idx}`, // Category: 'settings'
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Minimize2, unit: 'A',
    description: `Limit current setting/measurement for phase L${idx + 1} (high precision). Scaled by 1000.`,
    category: 'settings' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'limit-current-precise',
    label: '',
    isWritable: true, // Assuming this 'limit current' is a settable parameter.
  })),
  // --- Precise PV Measurements (i=55 to i=58) ---
  {
    id: 'pv1-v-precise', name: 'PV1 Voltage (Precise)', nodeId: 'ns=4;i=55',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'pv1-i-precise', name: 'PV1 Current (Precise)', nodeId: 'ns=4;i=56',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  {
    id: 'pv2-v-precise', name: 'PV2 Voltage (Precise)', nodeId: 'ns=4;i=57',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'pv2-i-precise', name: 'PV2 Current (Precise)', nodeId: 'ns=4;i=58',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  // --- Precise Inverter Output Measurements (i=59 to i=64) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-i-precise`),
    name: `Inverter Current ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${59 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'A',
    description: `Inverter output current phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-current-precise',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-v-precise`),
    name: `Inverter Voltage ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${62 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Inverter output voltage phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: '',
    isWritable: false,
  })),
  // --- Precise Battery Measurements (i=65, 66) ---
  {
    id: 'bat-i-precise', name: 'Battery Current (Precise)', nodeId: 'ns=4;i=65',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'A', category: 'battery',
    description: 'Battery current (high precision). Positive=charging, Negative=discharging. Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  {
    id: 'bat-v-precise', name: 'Battery Voltage (Precise)', nodeId: 'ns=4;i=66',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'V', category: 'battery',
    description: 'Battery voltage (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for Battery Voltage (e.g. 50000 for 50V) is unusual. Verify.', label: '',
    isWritable: false,
  },
  // --- Continuation from Index 59 ---
  {
    id: 'max-solar-sell-power-setting', name: 'Max Solar Sell Power Setting', nodeId: 'ns=4;i=68',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'control', factor: 1, phase: 'x',
    description: 'Setting for the maximum power (in Watts) allowed to be sold to the grid from solar.',
    notes: 'Log source showed Boolean, reassessed as Int16 for power setting.', label: '',
    isWritable: true,
  },
  {
    id: 'run-state', name: 'Run State Code', nodeId: 'ns=4;i=70',
    dataType: 'Int16', uiType: 'display', icon: Info, category: 'status', factor: 1, phase: 'x',
    description: 'Current operational state code of the inverter. Requires lookup table.',
    notes: 'Value needs interpretation via documentation or lookup table.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-generation-today', name: 'Active Energy Generation Today', 
    nodeId: 'ns=4;i=71',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kWh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total active energy generated today.',
    notes: 'Factor 0.1 for kWh. Verify raw unit.', label: '',
    isWritable: false,
  },
  {
    id: 'reactive-power-generation-today', name: 'Reactive Energy Generation Today',
    nodeId: 'ns=4;i=72',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kVARh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total reactive energy generated today.',
    notes: 'Factor 0.1 for kVARh. Verify raw unit.', label: '',
    isWritable: false,
  },
  {
    id: 'grid-connection-time-today', name: 'Grid Connection Time Today', nodeId: 'ns=4;i=73',
    dataType: 'Int16', uiType: 'display', icon: Clock, unit: 'min', category: 'status', factor: 1, phase: 'x',
    description: 'Total time the inverter has been connected to the grid today, in minutes.',
    notes: 'Assuming raw minutes.', label: '',
    isWritable: false,
  },
  // --- Combined Lifetime Counters (i=74 to i=92) ---
  {
    id: 'active-power-gen-total-low-byte', name: 'Active Energy Gen Total (Low Word)',
    nodeId: 'ns=4;i=74', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime active energy generation. Combine with High word (ns=4;i=75).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-high-byte', name: 'Active Energy Gen Total (High Word)',
    nodeId: 'ns=4;i=75', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime active energy generation. Combine with Low word (ns=4;i=74).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-low-byte-1', name: 'Active Energy Gen Total_1 (Low Word)',
    nodeId: 'ns=4;i=76', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of alternative total active energy generation counter. Combine with High word (ns=4;i=77).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-high-byte-1', name: 'Active Energy Gen Total_1 (High Word)',
    nodeId: 'ns=4;i=77', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of alternative total active energy generation counter. Combine with Low word (ns=4;i=76).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-battery-charge-energy', name: 'Day Battery Charge Energy', nodeId: 'ns=4;i=79',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy charged into the battery today.',
    notes: 'Unit (Wh) assumed. Small value like 3 from log might mean kWh or different scaling.', label: '',
    isWritable: false,
  },
  {
    id: 'total-charge-battery-low-byte', name: 'Total Battery Charge Energy (Low Word)',
    nodeId: 'ns=4;i=80', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery charge energy. Combine with High word (ns=4;i=81).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?) /Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-charge-battery-high-byte', name: 'Total Battery Charge Energy (High Word)',
    nodeId: 'ns=4;i=81', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery charge energy. Combine with Low word (ns=4;i=80).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-discharge-battery-low-byte', name: 'Total Battery Discharge Energy (Low Word)',
    nodeId: 'ns=4;i=82', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery discharge energy. Combine with High word (ns=4;i=83).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-discharge-battery-high-byte', name: 'Total Battery Discharge Energy (High Word)',
    nodeId: 'ns=4;i=83', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery discharge energy. Combine with Low word (ns=4;i=82).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-grid-buy-power-wh', name: 'Day Grid Buy Energy', nodeId: 'ns=4;i=84',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy bought from the grid today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'day-grid-sell-power-wh', name: 'Day Grid Sell Energy', nodeId: 'ns=4;i=85',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy sold to the grid today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-buy-power-wh-low-word', name: 'Total Grid Buy Energy (Low Word)',
    nodeId: 'ns=4;i=86', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid buy energy. Combine with High word (ns=4;i=87).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-buy-power-wh-high-word', name: 'Total Grid Buy Energy (High Word)',
    nodeId: 'ns=4;i=87', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid buy energy. Combine with Low word (ns=4;i=86).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-sell-power-wh-low-word', name: 'Total Grid Sell Energy (Low Word)',
    nodeId: 'ns=4;i=88', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid sell energy. Combine with High word (ns=4;i=89).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-sell-power-wh-high-word', name: 'Total Grid Sell Energy (High Word)',
    nodeId: 'ns=4;i=89', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid sell energy. Combine with Low word (ns=4;i=88).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-load-power-wh', name: 'Day Load Energy', nodeId: 'ns=4;i=90',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy consumed by the load today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'total-load-power-wh-low-word', name: 'Total Load Energy (Low Word)',
    nodeId: 'ns=4;i=91', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime load energy consumption. Combine with High word (ns=4;i=92).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-load-power-wh-high-word', name: 'Total Load Energy (High Word)',
    nodeId: 'ns=4;i=92', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime load energy consumption. Combine with Low word (ns=4;i=91).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  // --- Daily PV Energy (i=93 to i=97) ---
  {
    id: 'day-pv-power-wh', name: 'Day PV Total Energy', nodeId: 'ns=4;i=93',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy generated from all PV inputs today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  ...[1, 2, 3, 4].map(pvIdx => ({
    id: createId(`day-pv${pvIdx}-power-wh`),
    name: `Day PV${pvIdx} Energy`,
    nodeId: `ns=4;i=${93 + pvIdx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Sigma, unit: 'Wh', category: 'energy' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `Total energy generated from PV input ${pvIdx} today ${pvIdx > 2 ? '(if applicable)' : ''}.`,
    notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  })),
  // --- Total PV Energy (i=98, 99) ---
  {
    id: 'total-pv-power-wh-low-word', name: 'Total PV Energy (Low Word)', nodeId: 'ns=4;i=98',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime PV energy generation. Combine with High word (ns=4;i=99).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-pv-power-wh-high-word', name: 'Total PV Energy (High Word)', nodeId: 'ns=4;i=99',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime PV energy generation. Combine with Low word (ns=4;i=98).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  // --- Temperatures (i=101, 102) ---
  {
    id: 'dc-transformer-temperature', name: 'DC Transformer Temperature', nodeId: 'ns=4;i=101',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: (1 / 4095) * 100, phase: 'x',
    description: 'Temperature of the DC transformer component.', label: '',
    isWritable: false,
  },
  {
    id: 'heat-sink-temperature', name: 'Heat Sink Temperature', nodeId: 'ns=4;i=102',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: (1 / 4095) * 100, phase: 'x',
    description: 'Temperature of the inverter heat sink.', label: '',
    isWritable: false,
  },
  // --- Status Bits (i=104, 105) ---
  {
    id: 'on-off-status', name: 'On/Off Status', nodeId: 'ns=4;i=104',
    dataType: 'Boolean', uiType: 'display', icon: Power, category: 'status', factor: 1, phase: 'x',
    description: 'Indicates if the inverter is currently On (True/1) or Off (False/0).', label: '',
    isWritable: true, // This is status display; actual control likely via remote commands.
  },
  {
    id: 'ac-relay-status', name: 'AC Relay Status Code', nodeId: 'ns=4;i=105',
    dataType: 'Int16', uiType: 'display', icon: Waypoints, category: 'status', factor: 1, phase: 'x',
    description: 'Status code representing the state of the AC relay(s). Requires decoding.',
    notes: 'Value needs interpretation (bitmask or enum via documentation).', label: '',
    isWritable: false,
  },
  // --- Warning/Fault Words (i=106 to i=111) are commented out in source, preserving that
  // ...[...Array(2).keys()].map(k => ({ /* ... */ isWritable: false })),
  // ...[...Array(4).keys()].map(k => ({ /* ... */ isWritable: false })),
  // --- Battery Info (i=113 to i=115) ---
  {
    id: 'battery-temperature', name: 'Battery Temperature', nodeId: 'ns=4;i=113',
    dataType: 'Int16', uiType: 'gauge', icon: Thermometer, unit: '°C', category: 'battery', phase: 'x',
    min: -20, max: 70, description: 'Temperature of the battery. Scaled by (Raw / 4095) * 100.',
    factor: (1 / 4095) * 100, notes: 'Specific scaling. Verify calculation.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-voltage', name: 'Battery Voltage', nodeId: 'ns=4;i=114',
    dataType: 'Int16', uiType: 'gauge', icon: Battery, unit: 'V', category: 'battery', phase: 'x',
    min: 40, max: 58, description: 'Current battery voltage (e.g. raw 5163 -> 51.63V).', factor: 0.01, label: '',
    isWritable: false,
  },
  {
    id: 'battery-capacity', name: 'Battery Capacity (SoC)', nodeId: 'ns=4;i=115',
    dataType: 'Int16', uiType: 'gauge', icon: Percent, unit: '%', category: 'battery', phase: 'x',
    min: 0, max: 99.9, description: 'Current battery State of Charge (SoC) (e.g. raw 100 -> 100%).', factor: 1, label: '',
    isWritable: false,
  },
  // --- Placeholder and Battery Power/Current/AH (i=116 to i=119) ---
  {
    id: 'not-applicable-116', name: 'N/A (ns=4;i=116)', nodeId: 'ns=4;i=116',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=116.', notes: 'Marked N/A in source. Identify or hide.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-output-power', name: 'Battery Output Power', nodeId: 'ns=4;i=117',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'battery', factor: 1, phase: 'x',
    description: 'Current power flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -7 -> -7W).', label: '',
    isWritable: false,
  },
  {
    id: 'battery-output-current', name: 'Battery Output Current', nodeId: 'ns=4;i=118',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Current flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -15 -> -1.5A).', label: '',
    isWritable: false,
  },
  {
    id: 'corrected-ah', name: 'Corrected AH', nodeId: 'ns=4;i=119',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Ah', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Corrected Ampere-hour capacity or counter (e.g. raw 712 -> 71.2 Ah).', label: '',
    isWritable: false,
  },
  // --- Grid Voltages (Detailed, i=121 to 126) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-voltage-${ph}`), name: `Grid Voltage Phase ${ph.toUpperCase()}`, nodeId: `ns=4;i=${121 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: ph as ExtendedDataPoint['phase'],
    min: 180, max: 280, description: `Grid Phase ${ph.toUpperCase()} voltage measurement (e.g. raw 2360 -> 236.0V).`, isSinglePhase: false, threePhaseGroup: 'grid-voltage', label: '',
    isWritable: false,
  })),
  ...['ab', 'bc', 'ca'].map((pair, idx) => ({
    id: createId(`grid-line-voltage-${pair}`), name: `Grid Line Voltage ${pair.toUpperCase()}`, nodeId: `ns=4;i=${124 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `Line-to-line voltage between grid phases ${pair.toUpperCase()}.`, isSinglePhase: false, threePhaseGroup: 'grid-line-voltage', label: '',
    isWritable: false,
  })),
  // --- Grid Power Measurements (Inner/Side-to-Side/Apparent, i=127 to 133) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-inner-power-${ph}`), name: `Grid Inner Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${127 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power measured at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-inner-power', label: '',
    isWritable: false,
  })),
  {
    id: 'grid-total-active-power-side-to-side', name: 'Total Active Power (Grid Side-to-Side)', nodeId: 'ns=4;i=130',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total active power flow across grid connection (e.g. raw -2076 -> -2076W).', label: '',
    isWritable: false,
  },
  {
    id: 'grid-side-inner-total-apparent-power', name: 'Grid Side Inner Total Apparent Power', nodeId: 'ns=4;i=131',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'grid', factor: 1, phase: 'x',
    description: 'Total apparent power at inner grid connection.', notes: 'Assumed raw VA.', label: '',
    isWritable: false,
  },
  {
    id: 'grid-side-frequency', name: 'Grid Side Frequency', nodeId: 'ns=4;i=132',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'grid', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Frequency at grid side connection (e.g. raw 5008 -> 50.08 Hz).', label: '',
    isWritable: false,
  },
  // --- Grid Side Currents (Inner, i=133 to 135) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-inner-current-${ph}`), name: `Grid Side Inner Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${133 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.01, phase: ph as ExtendedDataPoint['phase'],
    description: `Current at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw 176 -> 1.76A).`, isSinglePhase: false, threePhaseGroup: 'grid-side-inner-current', label: '',
    isWritable: false,
  })),
  // --- Off-Grid/Load Side Measurements (i=136 to 143) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-current-${ph}`), name: `Off-Grid Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${136 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.01, phase: ph as ExtendedDataPoint['phase'],
    description: `Current on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 641 -> 6.41A).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-current', notes: 'Factor 0.01 assumed.', label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-power-${ph}`), name: `Off-Grid Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${139 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 348 -> 348W).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-power', notes: 'Factor 1 assumed.', label: '',
    isWritable: false,
  })),
  {
    id: 'out-of-grid-total-power', name: 'Off-Grid Total Power (Export)', nodeId: 'ns=4;i=142',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total power on load/backup side (off-grid capable) (e.g. raw 2086 -> 2086W).', notes: 'Factor 1 assumed.', label: '',
    isWritable: false,
  },
  {
    id: 'out-of-grid-total-apparent-power', name: 'Off-Grid Total Apparent Power', nodeId: 'ns=4;i=143',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total apparent power on load/backup side (off-grid capable).', notes: 'Assumed raw VA.', label: '',
    isWritable: false,
  },
  // --- Power Factor & Redundant Power/Misc (i=144 to 149) ---
  {
    id: 'grid-connected-power-factor', name: 'Grid Connected Power Factor', nodeId: 'ns=4;i=144',
    dataType: 'Int16', uiType: 'display', icon: SigmaSquare, unit: '', category: 'grid', factor: 0.01, phase: 'x',
    description: 'Overall power factor when connected to grid (e.g. raw 0 -> PF 0.00).', notes: 'Factor 0.01 assumes raw scaled by 100.', label: '',
    isWritable: false,
  },
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-${ph}-phase-power`), name: `Grid Side ${ph.toUpperCase()} Phase Power (Redundant?)`, nodeId: `ns=4;i=${145 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power on grid side, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-side-power',
    notes: `Potentially redundant with grid-inner-power-${ph} (ns=4;i=${127 + idx}). Verify.`, label: '',
    isWritable: false,
  })),
  {
    id: 'grid-side-total-power', name: 'Grid Side Total Power (Redundant?)', nodeId: 'ns=4;i=148',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total power on grid side (e.g. raw -2076 -> -2076W).',
    notes: 'Potentially redundant with grid-total-active-power-side-to-side (ns=4;i=130). Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'not-applicable-149', name: 'N/A (ns=4;i=149)', nodeId: 'ns=4;i=149',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=149.', notes: 'Marked N/A in source. Identify or hide.', label: '',
    isWritable: false,
  },
  // --- Index 15 ---
  {
    id: 'export-power-percentage-1',
    name: 'Export Power Percentage_1',
    nodeId: 'ns=4;i=21',
    dataType: 'Int16',
    uiType: 'display',
    icon: Percent,
    unit: '%',
    description: 'Alternative setting for export power limit percentage.',
    category: 'control',
    factor: 0.1,
    phase: 'x',
    notes: 'Purpose of _1 unclear, possibly alternative/redundant setting.',
    label: '',
    isWritable: true,
  },
  // --- Index 16 ---
  {
    id: 'error-message',
    name: 'Error Message Code',
    nodeId: 'ns=4;i=22',
    dataType: 'Int16', 
    uiType: 'display',
    icon: AlertTriangle,
    description: 'Current device error code. Value requires a lookup table for description.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Error code; needs interpretation via documentation or lookup table.',
    label: '',
    isWritable: false,
  },
  // --- Index 17 & 18: Total Power Generation (32-bit combined) ---
  {
    id: 'high-byte-total-power-generation',
    name: 'High Word Total Power Generation',
    nodeId: 'ns=4;i=24',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Sigma,
    description: 'High word of the total generated power. Combine with low word (ns=4;i=25).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: '',
    isWritable: false,
  },
  {
    id: 'low-byte-total-power-generation',
    name: 'Low Word Total Power Generation',
    nodeId: 'ns=4;i=25',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Sigma,
    description: 'Low word of the total generated power. Combine with high word (ns=4;i=24).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: '',
    isWritable: false,
  },
  // --- Index 19 & 20: Hourly Power Generation (32-bit combined) ---
  {
    id: 'high-byte-hourly-power-generation',
    name: 'High Word Hourly Power Generation',
    nodeId: 'ns=4;i=26',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap, 
    description: 'High word of the energy generated in the current hour. Combine with low word (ns=4;i=27).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD (likely Wh or kWh).',
    label: '',
    isWritable: false,
  },
  {
    id: 'low-byte-hourly-power-generation',
    name: 'Low Word Hourly Power Generation',
    nodeId: 'ns=4;i=27',
    dataType: 'Int16', 
    uiType: 'display',
    icon: Zap,
    description: 'Low word of the energy generated in the current hour. Combine with high word (ns=4;i=26).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor TBD.',
    label: '',
    isWritable: false,
  },
  // --- Index 21 to 24: PV Inputs ---
  {
    id: 'vpv1',
    name: 'PV1 Input Voltage',
    nodeId: 'ns=4;i=28',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 1.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'vpv2',
    name: 'PV2 Input Voltage',
    nodeId: 'ns=4;i=29',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 2.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'ipv1',
    name: 'PV1 Input Current',
    nodeId: 'ns=4;i=30',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Input current from PV string 1.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'ipv2',
    name: 'PV2 Input Current',
    nodeId: 'ns=4;i=31',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Input current from PV string 2.',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  // --- Index 25 to 33: Grid AC Measurements (Raw) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `vac${idx + 1}`,
    name: `L${idx + 1} Phase Voltage (Raw)`,
    nodeId: `ns=4;i=${32 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves,
    unit: 'V',
    description: `Grid voltage of phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.1,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `iac${idx + 1}`,
    name: `L${idx + 1} Phase Current (Raw)`,
    nodeId: `ns=4;i=${35 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves,
    unit: 'A',
    description: `Grid current of phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.1,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: `fac${idx + 1}`,
    name: `L${idx + 1} Phase Frequency (Raw)`,
    nodeId: `ns=4;i=${38 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: AudioWaveform,
    unit: 'Hz',
    description: `Grid frequency measured on phase L${idx + 1}.`,
    category: 'three-phase' as ExtendedDataPoint['category'],
    factor: 0.01,
    phase: ph as ExtendedDataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: '',
    isWritable: false,
  })),
  // --- Remaining items ---
  {
    id: 'pac-l-inverter-power',
    name: 'Inverter Active Power Output (Pac)',
    nodeId: 'ns=4;i=41',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total active power output from the inverter.',
    category: 'inverter',
    factor: 1, 
    phase: 'x',
    notes: 'Original name "Pac L / inverter current" was ambiguous. Assumed Power output.',
    label: '',
    isWritable: false,
  },
  {
    id: 'work-mode-status',
    name: 'Work Mode Status Code',
    nodeId: 'ns=4;i=42',
    dataType: 'Int16',
    uiType: 'display',
    icon: Info,
    description: 'Current inverter work mode status code. Requires lookup table for description.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Value needs interpretation via documentation or lookup table.',
    label: '',
    isWritable: false,
  },
  {
    id: 'inverter-internal-temperature',
    name: 'Inverter Internal Temperature',
    nodeId: 'ns=4;i=43',
    dataType: 'Int16',
    uiType: 'display', 
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature measured inside the inverter.',
    category: 'inverter',
    factor: 0.1,
    phase: 'x',
    label: '',
    isWritable: false,
  },
  {
    id: 'e-day-daily-power-generation',
    name: 'Daily Power Generation (E-day)',
    nodeId: 'ns=4;i=44',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'kWh',
    description: 'Total energy generated by the inverter today.',
    category: 'energy',
    factor: 0.1, 
    phase: 'x',
    notes: 'Factor 0.1 for kWh assumes raw value like 123 means 12.3 kWh. Verify unit.',
    label: '',
    isWritable: false,
  },
  // --- Precise AC Measurements (i=46 to i=64) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid${idx + 1}-i-precise`),
    name: `Grid Current L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${46 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'A',
    description: `Grid current of phase L${idx + 1} (high precision). Value scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-current-precise',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-v-l${idx + 1}-precise`),
    name: `Grid Voltage L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${49 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Grid voltage of phase L${idx + 1} (high precision). Value scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`limit${idx + 1}-i-precise`), // Limit current implies it could be a setting or a measurement of a set limit.
    name: `Limit Current L${idx + 1} (Precise)`, // Name suggests setting. If it IS a setting, should be writable.
    nodeId: `ns=4;i=${52 + idx}`, // Category: 'settings'
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Minimize2, unit: 'A',
    description: `Limit current setting/measurement for phase L${idx + 1} (high precision). Scaled by 1000.`,
    category: 'settings' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'limit-current-precise',
    label: '',
    isWritable: true, // Assuming this 'limit current' is a settable parameter.
  })),
  // --- Precise PV Measurements (i=55 to i=58) ---
  {
    id: 'pv1-v-precise', name: 'PV1 Voltage (Precise)', nodeId: 'ns=4;i=55',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'pv1-i-precise', name: 'PV1 Current (Precise)', nodeId: 'ns=4;i=56',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  {
    id: 'pv2-v-precise', name: 'PV2 Voltage (Precise)', nodeId: 'ns=4;i=57',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'pv2-i-precise', name: 'PV2 Current (Precise)', nodeId: 'ns=4;i=58',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  // --- Precise Inverter Output Measurements (i=59 to i=64) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-i-precise`),
    name: `Inverter Current ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${59 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'A',
    description: `Inverter output current phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-current-precise',
    label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-v-precise`),
    name: `Inverter Voltage ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${62 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Inverter output voltage phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.001,
    phase: ph as ExtendedDataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: '',
    isWritable: false,
  })),
  // --- Precise Battery Measurements (i=65, 66) ---
  {
    id: 'bat-i-precise', name: 'Battery Current (Precise)', nodeId: 'ns=4;i=65',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'A', category: 'battery',
    description: 'Battery current (high precision). Positive=charging, Negative=discharging. Scaled by 1000.', factor: 0.001, phase: 'x', label: '',
    isWritable: false,
  },
  {
    id: 'bat-v-precise', name: 'Battery Voltage (Precise)', nodeId: 'ns=4;i=66',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'V', category: 'battery',
    description: 'Battery voltage (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for Battery Voltage (e.g. 50000 for 50V) is unusual. Verify.', label: '',
    isWritable: false,
  },
  // --- Continuation from Index 59 ---
  {
    id: 'max-solar-sell-power-setting', name: 'Max Solar Sell Power Setting', nodeId: 'ns=4;i=68',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'control', factor: 1, phase: 'x',
    description: 'Setting for the maximum power (in Watts) allowed to be sold to the grid from solar.',
    notes: 'Log source showed Boolean, reassessed as Int16 for power setting.', label: '',
    isWritable: true,
  },
  {
    id: 'run-state', name: 'Run State Code', nodeId: 'ns=4;i=70',
    dataType: 'Int16', uiType: 'display', icon: Info, category: 'status', factor: 1, phase: 'x',
    description: 'Current operational state code of the inverter. Requires lookup table.',
    notes: 'Value needs interpretation via documentation or lookup table.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-generation-today', name: 'Active Energy Generation Today', 
    nodeId: 'ns=4;i=71',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kWh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total active energy generated today.',
    notes: 'Factor 0.1 for kWh. Verify raw unit.', label: '',
    isWritable: false,
  },
  {
    id: 'reactive-power-generation-today', name: 'Reactive Energy Generation Today',
    nodeId: 'ns=4;i=72',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kVARh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total reactive energy generated today.',
    notes: 'Factor 0.1 for kVARh. Verify raw unit.', label: '',
    isWritable: false,
  },
  {
    id: 'grid-connection-time-today', name: 'Grid Connection Time Today', nodeId: 'ns=4;i=73',
    dataType: 'Int16', uiType: 'display', icon: Clock, unit: 'min', category: 'status', factor: 1, phase: 'x',
    description: 'Total time the inverter has been connected to the grid today, in minutes.',
    notes: 'Assuming raw minutes.', label: '',
    isWritable: false,
  },
  // --- Combined Lifetime Counters (i=74 to i=92) ---
  {
    id: 'active-power-gen-total-low-byte', name: 'Active Energy Gen Total (Low Word)',
    nodeId: 'ns=4;i=74', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime active energy generation. Combine with High word (ns=4;i=75).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-high-byte', name: 'Active Energy Gen Total (High Word)',
    nodeId: 'ns=4;i=75', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime active energy generation. Combine with Low word (ns=4;i=74).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-low-byte-1', name: 'Active Energy Gen Total_1 (Low Word)',
    nodeId: 'ns=4;i=76', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of alternative total active energy generation counter. Combine with High word (ns=4;i=77).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'active-power-gen-total-high-byte-1', name: 'Active Energy Gen Total_1 (High Word)',
    nodeId: 'ns=4;i=77', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of alternative total active energy generation counter. Combine with Low word (ns=4;i=76).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-battery-charge-energy', name: 'Day Battery Charge Energy', nodeId: 'ns=4;i=79',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy charged into the battery today.',
    notes: 'Unit (Wh) assumed. Small value like 3 from log might mean kWh or different scaling.', label: '',
    isWritable: false,
  },
  {
    id: 'total-charge-battery-low-byte', name: 'Total Battery Charge Energy (Low Word)',
    nodeId: 'ns=4;i=80', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery charge energy. Combine with High word (ns=4;i=81).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?) /Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-charge-battery-high-byte', name: 'Total Battery Charge Energy (High Word)',
    nodeId: 'ns=4;i=81', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery charge energy. Combine with Low word (ns=4;i=80).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-discharge-battery-low-byte', name: 'Total Battery Discharge Energy (Low Word)',
    nodeId: 'ns=4;i=82', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery discharge energy. Combine with High word (ns=4;i=83).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-discharge-battery-high-byte', name: 'Total Battery Discharge Energy (High Word)',
    nodeId: 'ns=4;i=83', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery discharge energy. Combine with Low word (ns=4;i=82).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-grid-buy-power-wh', name: 'Day Grid Buy Energy', nodeId: 'ns=4;i=84',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy bought from the grid today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'day-grid-sell-power-wh', name: 'Day Grid Sell Energy', nodeId: 'ns=4;i=85',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy sold to the grid today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-buy-power-wh-low-word', name: 'Total Grid Buy Energy (Low Word)',
    nodeId: 'ns=4;i=86', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid buy energy. Combine with High word (ns=4;i=87).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-buy-power-wh-high-word', name: 'Total Grid Buy Energy (High Word)',
    nodeId: 'ns=4;i=87', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid buy energy. Combine with Low word (ns=4;i=86).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-sell-power-wh-low-word', name: 'Total Grid Sell Energy (Low Word)',
    nodeId: 'ns=4;i=88', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid sell energy. Combine with High word (ns=4;i=89).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-grid-sell-power-wh-high-word', name: 'Total Grid Sell Energy (High Word)',
    nodeId: 'ns=4;i=89', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid sell energy. Combine with Low word (ns=4;i=88).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'day-load-power-wh', name: 'Day Load Energy', nodeId: 'ns=4;i=90',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy consumed by the load today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  {
    id: 'total-load-power-wh-low-word', name: 'Total Load Energy (Low Word)',
    nodeId: 'ns=4;i=91', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime load energy consumption. Combine with High word (ns=4;i=92).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-load-power-wh-high-word', name: 'Total Load Energy (High Word)',
    nodeId: 'ns=4;i=92', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime load energy consumption. Combine with Low word (ns=4;i=91).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  // --- Daily PV Energy (i=93 to i=97) ---
  {
    id: 'day-pv-power-wh', name: 'Day PV Total Energy', nodeId: 'ns=4;i=93',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy generated from all PV inputs today.', notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  },
  ...[1, 2, 3, 4].map(pvIdx => ({
    id: createId(`day-pv${pvIdx}-power-wh`),
    name: `Day PV${pvIdx} Energy`,
    nodeId: `ns=4;i=${93 + pvIdx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Sigma, unit: 'Wh', category: 'energy' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `Total energy generated from PV input ${pvIdx} today ${pvIdx > 2 ? '(if applicable)' : ''}.`,
    notes: 'Assumed raw Wh.', label: '',
    isWritable: false,
  })),
  // --- Total PV Energy (i=98, 99) ---
  {
    id: 'total-pv-power-wh-low-word', name: 'Total PV Energy (Low Word)', nodeId: 'ns=4;i=98',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime PV energy generation. Combine with High word (ns=4;i=99).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: '',
    isWritable: false,
  },
  {
    id: 'total-pv-power-wh-high-word', name: 'Total PV Energy (High Word)', nodeId: 'ns=4;i=99',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime PV energy generation. Combine with Low word (ns=4;i=98).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: '',
    isWritable: false,
  },
  // --- Temperatures (i=101, 102) ---
  {
    id: 'dc-transformer-temperature', name: 'DC Transformer Temperature', nodeId: 'ns=4;i=101',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: (1 / 4095) * 100, phase: 'x',
    description: 'Temperature of the DC transformer component.', label: '',
    isWritable: false,
  },
  {
    id: 'heat-sink-temperature', name: 'Heat Sink Temperature', nodeId: 'ns=4;i=102',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: (1 / 4095) * 100, phase: 'x',
    description: 'Temperature of the inverter heat sink.', label: '',
    isWritable: false,
  },
  // --- Status Bits (i=104, 105) ---
  {
    id: 'on-off-status', name: 'On/Off Status', nodeId: 'ns=4;i=104',
    dataType: 'Boolean', uiType: 'display', icon: Power, category: 'status', factor: 1, phase: 'x',
    description: 'Indicates if the inverter is currently On (True/1) or Off (False/0).', label: '',
    isWritable: true, // This is status display; actual control likely via remote commands.
  },
  {
    id: 'ac-relay-status', name: 'AC Relay Status Code', nodeId: 'ns=4;i=105',
    dataType: 'Int16', uiType: 'display', icon: Waypoints, category: 'status', factor: 1, phase: 'x',
    description: 'Status code representing the state of the AC relay(s). Requires decoding.',
    notes: 'Value needs interpretation (bitmask or enum via documentation).', label: '',
    isWritable: false,
  },
  // --- Warning/Fault Words (i=106 to i=111) are commented out in source, preserving that
  // ...[...Array(2).keys()].map(k => ({ /* ... */ isWritable: false })),
  // ...[...Array(4).keys()].map(k => ({ /* ... */ isWritable: false })),
  // --- Battery Info (i=113 to i=115) ---
  {
    id: 'battery-temperature', name: 'Battery Temperature', nodeId: 'ns=4;i=113',
    dataType: 'Int16', uiType: 'gauge', icon: Thermometer, unit: '°C', category: 'battery', phase: 'x',
    min: -20, max: 70, description: 'Temperature of the battery. Scaled by (Raw / 4095) * 100.',
    factor: (1 / 4095) * 100, notes: 'Specific scaling. Verify calculation.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-voltage', name: 'Battery Voltage', nodeId: 'ns=4;i=114',
    dataType: 'Int16', uiType: 'gauge', icon: Battery, unit: 'V', category: 'battery', phase: 'x',
    min: 40, max: 58, description: 'Current battery voltage (e.g. raw 5163 -> 51.63V).', factor: 0.01, label: '',
    isWritable: false,
  },
  {
    id: 'battery-capacity', name: 'Battery Capacity (SoC)', nodeId: 'ns=4;i=115',
    dataType: 'Int16', uiType: 'gauge', icon: Percent, unit: '%', category: 'battery', phase: 'x',
    min: 0, max: 99.9, description: 'Current battery State of Charge (SoC) (e.g. raw 100 -> 100%).', factor: 1, label: '',
    isWritable: false,
  },
  // --- Placeholder and Battery Power/Current/AH (i=116 to i=119) ---
  {
    id: 'not-applicable-116', name: 'N/A (ns=4;i=116)', nodeId: 'ns=4;i=116',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=116.', notes: 'Marked N/A in source. Identify or hide.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-output-power', name: 'Battery Output Power', nodeId: 'ns=4;i=117',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'battery', factor: 1, phase: 'x',
    description: 'Current power flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -7 -> -7W).', label: '',
    isWritable: false,
  },
  {
    id: 'battery-output-current', name: 'Battery Output Current', nodeId: 'ns=4;i=118',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Current flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -15 -> -1.5A).', label: '',
    isWritable: false,
  },
  {
    id: 'corrected-ah', name: 'Corrected AH', nodeId: 'ns=4;i=119',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Ah', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Corrected Ampere-hour capacity or counter (e.g. raw 712 -> 71.2 Ah).', label: '',
    isWritable: false,
  },
  // --- Grid Voltages (Detailed, i=121 to 126) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-voltage-${ph}`), name: `Grid Voltage Phase ${ph.toUpperCase()}`, nodeId: `ns=4;i=${121 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: ph as ExtendedDataPoint['phase'],
    min: 180, max: 280, description: `Grid Phase ${ph.toUpperCase()} voltage measurement (e.g. raw 2360 -> 236.0V).`, isSinglePhase: false, threePhaseGroup: 'grid-voltage', label: '',
    isWritable: false,
  })),
  ...['ab', 'bc', 'ca'].map((pair, idx) => ({
    id: createId(`grid-line-voltage-${pair}`), name: `Grid Line Voltage ${pair.toUpperCase()}`, nodeId: `ns=4;i=${124 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `Line-to-line voltage between grid phases ${pair.toUpperCase()}.`, isSinglePhase: false, threePhaseGroup: 'grid-line-voltage', label: '',
    isWritable: false,
  })),
  // --- Grid Power Measurements (Inner/Side-to-Side/Apparent, i=127 to 133) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-inner-power-${ph}`), name: `Grid Inner Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${127 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power measured at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-inner-power', label: '',
    isWritable: false,
  })),
  {
    id: 'grid-total-active-power-side-to-side', name: 'Total Active Power (Grid Side-to-Side)', nodeId: 'ns=4;i=130',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total active power flow across grid connection (e.g. raw -2076 -> -2076W).', label: '',
    isWritable: false,
  },
  {
    id: 'grid-side-inner-total-apparent-power', name: 'Grid Side Inner Total Apparent Power', nodeId: 'ns=4;i=131',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'grid', factor: 1, phase: 'x',
    description: 'Total apparent power at inner grid connection.', notes: 'Assumed raw VA.', label: '',
    isWritable: false,
  },
  {
    id: 'grid-side-frequency', name: 'Grid Side Frequency', nodeId: 'ns=4;i=132',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'grid', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Frequency at grid side connection (e.g. raw 5008 -> 50.08 Hz).', label: '',
    isWritable: false,
  },
  // --- Grid Side Currents (Inner, i=133 to 135) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-inner-current-${ph}`), name: `Grid Side Inner Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${133 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.01, phase: ph as ExtendedDataPoint['phase'],
    description: `Current at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw 176 -> 1.76A).`, isSinglePhase: false, threePhaseGroup: 'grid-side-inner-current', label: '',
    isWritable: false,
  })),
  // --- Off-Grid/Load Side Measurements (i=136 to 143) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-current-${ph}`), name: `Off-Grid Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${136 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.01, phase: ph as ExtendedDataPoint['phase'],
    description: `Current on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 641 -> 6.41A).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-current', notes: 'Factor 0.01 assumed.', label: '',
    isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-power-${ph}`), name: `Off-Grid Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${139 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 348 -> 348W).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-power', notes: 'Factor 1 assumed.', label: '',
    isWritable: false,
  })),
  {
    id: 'out-of-grid-total-power', name: 'Off-Grid Total Power (Export)', nodeId: 'ns=4;i=142',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total power on load/backup side (off-grid capable) (e.g. raw 2086 -> 2086W).', notes: 'Factor 1 assumed.', label: '',
    isWritable: false,
  },
  {
    id: 'out-of-grid-total-apparent-power', name: 'Off-Grid Total Apparent Power', nodeId: 'ns=4;i=143',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total apparent power on load/backup side (off-grid capable).', notes: 'Assumed raw VA.', label: '',
    isWritable: false,
  },
  // --- Power Factor & Redundant Power/Misc (i=144 to 149) ---
  {
    id: 'grid-connected-power-factor', name: 'Grid Connected Power Factor', nodeId: 'ns=4;i=144',
    dataType: 'Int16', uiType: 'display', icon: SigmaSquare, unit: '', category: 'grid', factor: 0.01, phase: 'x',
    description: 'Overall power factor when connected to grid (e.g. raw 0 -> PF 0.00).', notes: 'Factor 0.01 assumes raw scaled by 100.', label: '',
    isWritable: false,
  },
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-${ph}-phase-power`), name: `Grid Side ${ph.toUpperCase()} Phase Power (Redundant?)`, nodeId: `ns=4;i=${145 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
    description: `Power on grid side, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-side-power',
    notes: `Potentially redundant with grid-inner-power-${ph} (ns=4;i=${127 + idx}). Verify.`, label: '',
    isWritable: false,
  })),
  {
    id: 'grid-side-total-power', name: 'Grid Side Total Power (Redundant?)', nodeId: 'ns=4;i=148',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total power on grid side (e.g. raw -2076 -> -2076W).',
    notes: 'Potentially redundant with grid-total-active-power-side-to-side (ns=4;i=130). Verify.', label: '',
    isWritable: false,
  },
  {
    id: 'not-applicable-149', name: 'N/A (ns=4;i=149)', nodeId: 'ns=4;i=149',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=149.', notes: 'Marked N/A in source. Identify or hide.', label: '',
    isWritable: false,
  },
  // --- Inverter Output Measurements (i=150 to 161) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-voltage-${ph}`), name: `Inverter Output Phase Voltage ${ph.toUpperCase()}`, nodeId: `ns=4;i=${150 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: ph as ExtendedDataPoint['phase'],
      description: `Output voltage from inverter, Phase ${ph.toUpperCase()} (e.g. raw 2365 -> 236.5V).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-voltage', label: '',
      isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-current-${ph}`), name: `Inverter Output Phase Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${153 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.01, phase: ph as ExtendedDataPoint['phase'],
      description: `Output current from inverter, Phase ${ph.toUpperCase()} (e.g. raw 790 -> 7.90A).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-current', label: '',
      isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-power-${ph}`), name: `Inverter Output Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${156 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
      description: `Output power from inverter, Phase ${ph.toUpperCase()} (e.g. raw 1890 -> 1890W).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-power', label: '',
      isWritable: false,
  })),
  {
    id: 'inverter-output-total-power', name: 'Inverter Output Total Power', nodeId: 'ns=4;i=159',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total active power output from inverter (e.g. raw 5438 -> 5438W).', label: '',
    isWritable: false,
  },
  {
    id: 'inverter-output-total-apparent-power', name: 'Inverter Output Total Apparent Power', nodeId: 'ns=4;i=160',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total apparent power output from inverter (e.g. raw 5438 -> 5438VA).', notes: 'If W and VA match, implies PF=1 or specific calculation.', label: '',
    isWritable: false,
  },
  {
    id: 'inverter-frequency', name: 'Inverter Frequency', nodeId: 'ns=4;i=161',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'inverter', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Output frequency of the inverter (e.g. raw 5008 -> 50.08 Hz).', label: '',
    isWritable: false,
  },

  // --- UPS/Load Side Power (i=162 to i=166) ---
  {
    id: 'not-applicable-162', name: 'N/A_1 (ns=4;i=162)', nodeId: 'ns=4;i=162',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=162.', notes: 'Marked N/A_1 in source. Identify or hide.', label: '',
    isWritable: false,
  },
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`ups-load-side-phase-power-${ph}`), name: `UPS Load-Side Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${163 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Lightbulb, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
      description: `Power on UPS/backup output load, Phase ${ph.toUpperCase()} (e.g. raw 1562 -> 1562W).`, isSinglePhase: false, threePhaseGroup: 'ups-load-power', label: '',
      isWritable: false,
  })),
  {
    id: 'ups-load-side-total-power', name: 'UPS Load-Side Total Power', nodeId: 'ns=4;i=166',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total power on UPS/backup output load (e.g. raw 3362 -> 3362W).', label: '',
    isWritable: false,
  },

  // --- Load Measurements (Voltage, Current[unused], Power, Apparent Power, Freq) (i=167 to 178) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-voltage-${ph}`), name: `Load Phase Voltage ${ph.toUpperCase()}`, nodeId: `ns=4;i=${167 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as ExtendedDataPoint['category'], factor: 0.1, phase: ph as ExtendedDataPoint['phase'],
      description: `Voltage at load terminals, Phase ${ph.toUpperCase()} (e.g. raw 2374 -> 237.4V).`, isSinglePhase: false, threePhaseGroup: 'load-voltage', label: '',
      isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-current-${ph}-no-use`), name: `Load Phase Current ${ph.toUpperCase()} (no use)`, nodeId: `ns=4;i=${170 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: HelpCircle, unit: 'A', category: 'status' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
      description: `Load phase current ${ph.toUpperCase()} - marked as not used.`, notes: 'Marked "no use"; verify or hide.', label: '',
      isWritable: false,
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-power-${ph}`), name: `Load Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${173 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Lightbulb, unit: 'W', category: 'three-phase' as ExtendedDataPoint['category'], factor: 1, phase: ph as ExtendedDataPoint['phase'],
      description: `Power consumed by load, Phase ${ph.toUpperCase()} (e.g. raw 1562 -> 1562W).`, isSinglePhase: false, threePhaseGroup: 'load-power', label: '',
      isWritable: false,
  })),
  {
    id: 'load-total-power', name: 'Total Load Power', nodeId: 'ns=4;i=176',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total active power consumed by the load (e.g. raw 3362 -> 3362W).', notes: 'Verify raw value means Watts.', label: '',
    isWritable: false,
  },
  {
    id: 'load-total-apparent-power', name: 'Load Total Apparent Power', nodeId: 'ns=4;i=177',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'VA', category: 'grid', factor: 1, phase: 'x',
    description: 'Total apparent power consumed by load (e.g. raw 3362 -> 3362VA).', notes: 'Log name mentioned "undefine cal". Verify calculation if needed.', label: '',
    isWritable: false,
  },
  {
    id: 'load-frequency', name: 'Load Frequency', nodeId: 'ns=4;i=178',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'grid', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Frequency measured at load terminals (e.g. raw 5008 -> 50.08 Hz).', label: '',
    isWritable: false,
  },

  // --- PV Input Powers & DC Measurements (i=180 to 191) ---
  ...[1, 2, 3, 4].map(pvIdx => ({
    id: createId(`input-power-pv${pvIdx}`), name: `Input Power PV${pvIdx}`, nodeId: `ns=4;i=${179 + pvIdx}`, 
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'pv' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `Instantaneous power from PV input ${pvIdx} ${pvIdx > 2 ? '(if applicable)' : ''}.`, notes: 'Factor 1 assumes raw Watts.', label: '',
    isWritable: false,
  })),
  ...[1, 2, 3, 4].map(dcIdx => ({
    id: createId(`dc-voltage-${dcIdx}`), name: `DC Voltage ${dcIdx} (PV${dcIdx}?)`, nodeId: `ns=4;i=${183 + dcIdx * 2 - 1}`, 
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Zap, unit: 'V', category: 'pv' as ExtendedDataPoint['category'], factor: 0.1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `DC voltage measurement point ${dcIdx}${dcIdx <= 2 ? ` (likely PV${dcIdx} input, e.g. raw 3845->384.5V)` : ' (if applicable)'}.`, notes: `Potentially redundant with vpv${dcIdx} / vpv${dcIdx}-precise. Verify source.`, label: '',
    isWritable: false,
  })),
  ...[1, 2, 3, 4].map(dcIdx => ({
    id: createId(`dc-current-${dcIdx}`), name: `DC Current ${dcIdx} (PV${dcIdx}?)`, nodeId: `ns=4;i=${183 + dcIdx * 2}`, 
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'pv' as ExtendedDataPoint['category'], factor: 0.1, phase: 'x' as ExtendedDataPoint['phase'],
    description: `DC current measurement point ${dcIdx}${dcIdx <= 2 ? ` (likely PV${dcIdx} input, e.g. raw 124->12.4A)` : ' (if applicable)'}.`, notes: `Potentially redundant with ipv${dcIdx} / ipv${dcIdx}-precise. Verify source.`, label: '',
    isWritable: false,
  })),

  // --- Control / Battery Settings (i=193 to 215, and renumbered ones like 283-285) ---
   {
    id: 'control-mode', name: 'Control Mode Code', nodeId: 'ns=4;i=193',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'control', factor: 1, phase: 'x',
    description: 'Current battery/system control mode code. Requires lookup table. Assumed writable to change mode.', notes: 'Value needs interpretation via lookup.', label: '',
    isWritable: true,
  },
  {
    id: 'equalization-v', name: 'Equalization Voltage Setting', nodeId: 'ns=4;i=194',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured equalization charge voltage (e.g. raw 5720 -> 57.20V).', label: '',
    isWritable: true,
  },
  {
    id: 'absorption-v', name: 'Absorption Voltage Setting', nodeId: 'ns=4;i=195',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured absorption charge voltage (e.g. raw 5720 -> 57.20V).', label: '',
    isWritable: true,
  },
  {
    id: 'float-v', name: 'Float Voltage Setting', nodeId: 'ns=4;i=196',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured float charge voltage (e.g. raw 5525 -> 55.25V).', label: '',
    isWritable: true,
  },
  {
    id: 'batt-capacity-setting', name: 'Battery Capacity Setting', nodeId: 'ns=4;i=197',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'Ah', category: 'settings', factor: 1, phase: 'x',
    description: 'Configured nominal battery capacity.', notes: 'Factor 1 -> 1000 means 1000Ah. Verify scaling (0.1 for 100.0Ah?).', label: '',
    isWritable: true,
  },
  {
    id: 'empty-v', name: 'Empty Voltage Setting (Cutoff)', nodeId: 'ns=4;i=198',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured battery voltage considered empty (cutoff) (e.g. raw 4500 -> 45.00V).', label: '',
    isWritable: true,
  },
  {
    id: 'zero-export-power-setting', name: 'Zero Export Power Setting', nodeId: 'ns=4;i=199',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
    description: 'Power threshold setting for zero export control (e.g. raw 20 -> 20W).', label: '',
    isWritable: true,
  },
  {
    id: 'equalization-day-cycle', name: 'Equalization Day Cycle', nodeId: 'ns=4;i=200',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'days', category: 'settings', factor: 1, phase: 'x',
    description: 'Frequency of equalization charge in days (e.g. raw 90 -> 90 days).', label: '',
    isWritable: true,
  },
  {
    id: 'equalization-time', name: 'Equalization Time Setting', nodeId: 'ns=4;i=201',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'min', category: 'settings', factor: 1, phase: 'x',
    description: 'Duration of equalization charge in minutes.', notes: 'Assumed raw minutes.', label: '',
    isWritable: true,
  },
  {
    id: 'tempco', name: 'TEMPCO Setting', nodeId: 'ns=4;i=202', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'mV/°C/Cell', category: 'settings', factor: 1, phase: 'x',
    description: 'Battery temperature compensation coefficient setting.', notes: 'Unit/factor need verification.', label: '',
    isWritable: true,
  },
  {
    id: 'max-a-charge-battery-setting', name: 'Max Charge Current Setting', nodeId: 'ns=4;i=203', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum allowed battery charging current (e.g. raw 200 -> 20.0A).', label: '',
    isWritable: true,
  },
  {
    id: 'max-a-discharge-battery-setting', name: 'Max Discharge Current Setting', nodeId: 'ns=4;i=204', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum allowed battery discharging current (e.g. raw 195 -> 19.5A).', label: '',
    isWritable: true,
  },
  {
    id: 'lithium-battery-wakeup-sign-bit', name: 'Lithium Battery Wakeup Signal Status', nodeId: 'ns=4;i=206', 
    dataType: 'Boolean', uiType: 'display', icon: Activity, category: 'status', factor: 1, phase: 'x',
    description: 'Status bit indicating Lithium battery wakeup signal.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-resistance-value', name: 'Battery Resistance Value', nodeId: 'ns=4;i=207', 
    dataType: 'Int16', uiType: 'display', icon: Gauge, unit: 'mΩ', category: 'battery', factor: 1, phase: 'x',
    description: 'Measured or calculated internal battery resistance (e.g. raw 25 -> 25mΩ).', notes: 'Unit (mΩ) and factor (1) assumed.', label: '',
    isWritable: false,
  },
  {
    id: 'battery-charging-efficiency-setting', name: 'Battery Charging Efficiency Setting', nodeId: 'ns=4;i=208', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Configured battery charging efficiency (e.g. raw 990 -> 99.0%).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-capacity-shutdown-setting', name: 'Capacity Shutdown Setting (%)', nodeId: 'ns=4;i=209', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to trigger shutdown (e.g. raw 20 -> 20%).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-capacity-restart-setting', name: 'Capacity Restart Setting (%)', nodeId: 'ns=4;i=210', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to allow restart after shutdown (e.g. raw 50 -> 50%).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-capacity-low-battery-setting', name: 'Capacity Low Battery Setting (%)', nodeId: 'ns=4;i=211', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to indicate low battery warning (e.g. raw 20 -> 20%).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-voltage-shutdown-setting', name: 'Voltage Shutdown Setting', nodeId: 'ns=4;i=212', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to trigger shutdown (e.g. raw 4600 -> 46.00V).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-voltage-restart-setting', name: 'Voltage Restart Setting', nodeId: 'ns=4;i=213', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to allow restart after shutdown (e.g. raw 5200 -> 52.00V).', label: '',
    isWritable: true,
  },
  {
    id: 'battery-voltage-low-battery-setting', name: 'Voltage Low Battery Setting', nodeId: 'ns=4;i=214', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to indicate low battery warning (e.g. raw 4750 -> 47.50V).', label: '',
    isWritable: true,
  },
  {
    id: 'grid-charging-start-voltage-point-setting', name: 'Grid Charging Start Voltage Setting', nodeId: 'ns=4;i=216', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold below which grid charging can start (e.g. raw 4900 -> 49.00V).', label: '',
    isWritable: true,
  },
  {
    id: 'grid-charging-start-capacity-point-setting', name: 'Grid Charging Start Capacity Setting', nodeId: 'ns=4;i=217', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'Battery SoC (%) threshold below which grid charging can start (e.g. raw 40 -> 40%).', label: '',
    isWritable: true,
  },
  {
    id: 'grid-charge-battery-current-setting', name: 'Grid Charge Battery Current Setting', nodeId: 'ns=4;i=218', 
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum current allowed when charging battery from grid (e.g. raw 40 -> 4.0A).', label: '',
    isWritable: true,
  },

  // --- Items from Index 200 onwards ---
  {
    id: createId('Grid Charged Enable'), name: 'Grid Charged Enable Status/Setting', nodeId: 'ns=4;i=220',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Indicates if charging from the grid is enabled or currently allowed.', notes: 'Verify if read-only or writable (0=Disabled, 1=Enabled). Assumed writable.', label: '',
    isWritable: true,
  },
  {
    id: createId('AC Couple'), name: 'AC Couple Setting/Status', nodeId: 'ns=4;i=221',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'AC Coupling feature setting or status (e.g., Enabled/Disabled).', notes: 'Verify if read-only or writable. Assumed writable.', label: '',
    isWritable: true,
  },
  {
    id: createId('Energy Management model'), name: 'Energy Management Model Code', nodeId: 'ns=4;i=223',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Selected Energy Management strategy model code.', notes: 'Value requires lookup. Assumed writable setting.', label: '',
    isWritable: true,
  },
  {
    id: createId('Limit Control function'), name: 'Limit Control Function Switch', nodeId: 'ns=4;i=224',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable the Limit Control function (e.g., export/import limits).', label: '',
    isWritable: true,
  },
  {
    id: createId('Limit max grid power output'), name: 'Max Grid Power Output Limit Setting', nodeId: 'ns=4;i=225',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'control', factor: 1, phase: 'x',
    description: 'Setting for maximum power output allowed to the grid.', notes: 'Unit (W) / factor (1) assumed. Verify scaling.', label: '',
    isWritable: true,
  },
  // i=223 omitted if unknown
  {
    id: createId('Solar sell enable'), name: 'Solar Sell Enable Switch', nodeId: 'ns=4;i=227',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable selling solar power to the grid.', label: '',
    isWritable: true,
  },
  {
    id: createId('Time of use selling enabled'), name: 'Time of Use Selling Enabled Switch', nodeId: 'ns=4;i=228',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable selling power based on Time of Use (TOU) schedule.', label: '',
    isWritable: true,
  },
  {
    id: createId('Grid Phase setting'), name: 'Grid Phase Setting Code', nodeId: 'ns=4;i=229',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Configured grid phase type code (e.g., 1=Single, 3=Three).', notes: 'Value requires lookup. Assumed writable setting.', label: '',
    isWritable: true,
  },
  // --- Time of Use Settings (Bulk generated, i=227 to 256) ---
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode time point ${idx + 1}`),
      name: `TOU Sell Mode Time Point ${idx + 1}`,
      nodeId: `ns=4;i=${230 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Clock,
      description: `Time of Use (TOU) - Sell Mode Time Point ${idx + 1} Setting (HHMM).`,
      category: 'settings' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
      notes: 'Value likely encoded as HHMM. Needs decoding.', label: '',
      isWritable: true,
  })),
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode power ${idx + 1}`),
      name: `TOU Sell Mode Power Setting ${idx + 1}`,
      nodeId: `ns=4;i=${236 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: 'W',
      description: `Time of Use (TOU) - Power Setting (Watts) for Time Point ${idx + 1}.`,
      category: 'settings' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
      notes: 'Unit (W) / factor (1) assumed.', label: '',
      isWritable: true,
  })),
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode voltage ${idx + 1}`),
      name: `TOU Sell Mode Voltage Setting ${idx + 1}`,
      nodeId: `ns=4;i=${242 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: 'V',
      description: `Time of Use (TOU) - Voltage Limit/Target for Time Point ${idx + 1}.`,
      category: 'settings' as ExtendedDataPoint['category'], factor: 0.1, phase: 'x' as ExtendedDataPoint['phase'],
      notes: 'Purpose (limit/target?), unit (V), factor (0.1) assumed.', label: '',
      isWritable: true,
  })),
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode capacity ${idx + 1}`),
      name: `TOU Sell Mode SoC Setting ${idx + 1}`,
      nodeId: `ns=4;i=${248 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: '%',
      description: `Time of Use (TOU) - Battery SoC Limit/Target for Time Point ${idx + 1}.`,
      category: 'settings' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
      notes: 'Purpose (limit/target?), unit (%) assumed.', label: '',
      isWritable: true,
  })),
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Charge mode enable ${idx + 1}`),
      name: `TOU Charge Mode Enable Setting ${idx + 1}`,
      nodeId: `ns=4;i=${254 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], 
      uiType: 'switch' as DataPoint['uiType'], icon: ToggleRight,
      description: `Time of Use (TOU) - Enable charging during Time Point ${idx + 1}.`,
      category: 'settings' as ExtendedDataPoint['category'], factor: 1, phase: 'x' as ExtendedDataPoint['phase'],
      label: '',
      isWritable: true,
  })),

  // --- Remaining settings/status from i=258 onwards ---
  {
      id: createId('Grid Mode'), name: 'Grid Mode Code', nodeId: 'ns=4;i=261',
      dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
      description: 'Current grid interaction mode code.', notes: 'Requires lookup table. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Frequency Setting'), name: 'Grid Frequency Setting', nodeId: 'ns=4;i=262',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Configured nominal grid frequency (e.g., 50Hz, 60Hz).', notes: 'Factor 0.01 assumes raw 5000/6000. Verify. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Type Setting'), name: 'Grid Type Setting Code', nodeId: 'ns=4;i=263',
      dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
      description: 'Configured grid type code (e.g., TN, TT, IT).', notes: 'Requires lookup table. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Voltage High Limit Setting Alt'), name: 'Grid Voltage High Limit Setting (Alt)', nodeId: 'ns=4;i=264',
      dataType: 'Int16', uiType: 'display', icon: Maximize2, unit: 'V', category: 'settings', factor: 0.1, phase: 'x',
      description: 'Alternative upper voltage limit setting for grid connection.', notes: 'Potentially redundant with i=6. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Voltage Low Limit Setting Alt'), name: 'Grid Voltage Low Limit Setting (Alt)', nodeId: 'ns=4;i=265',
      dataType: 'Int16', uiType: 'display', icon: Minimize2, unit: 'V', category: 'settings', factor: 0.1, phase: 'x',
      description: 'Alternative lower voltage limit setting for grid connection.', notes: 'Potentially redundant with i=5. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Hz High Limit Setting Alt'), name: 'Grid Frequency High Limit Setting (Alt)', nodeId: 'ns=4;i=266',
      dataType: 'Int16', uiType: 'display', icon: Maximize2, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Alternative upper frequency limit setting for grid connection.', notes: 'Potentially redundant with i=8. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid Hz Low Limit Setting Alt'), name: 'Grid Frequency Low Limit Setting (Alt)', nodeId: 'ns=4;i=267',
      dataType: 'Int16', uiType: 'display', icon: Minimize2, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Alternative lower frequency limit setting for grid connection.', notes: 'Potentially redundant with i=7. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Generator connected to grid input'), name: 'Generator Connected Status/Setting', nodeId: 'ns=4;i=268',
      dataType: 'Int16', uiType: 'display', icon: Power, category: 'settings', factor: 1, phase: 'x',
      description: 'Indicates if a generator is connected to the grid input terminal.', notes: 'Verify if status or setting. Assumed writable configuration.', label: '',
      isWritable: true,
  },
  {
      id: createId('Generator peak shaving power'), name: 'Generator Peak Shaving Power Setting', nodeId: 'ns=4;i=269',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
      description: 'Power setting for generator peak shaving.', notes: 'Unit (W)/factor (1) assumed. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('Grid peak shaving Power'), name: 'Grid Peak Shaving Power Setting', nodeId: 'ns=4;i=270',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
      description: 'Power setting for grid peak shaving.', notes: 'Unit (W)/factor (1) assumed. Assumed writable.', label: '',
      isWritable: true,
  },
  {
      id: createId('UPS Delay time'), name: 'UPS Delay Time Setting', nodeId: 'ns=4;i=272',
      dataType: 'Int16', uiType: 'display', icon: Clock, unit: 's', category: 'settings', factor: 1, phase: 'x',
      description: 'Delay time setting (seconds) for UPS/backup transition.', notes: 'Unit (s)/factor (1) assumed. Assumed writable.', label: '',
      isWritable: true,
  },



  // --- Meter Status (382-384) ---
  { id: createId('Meter Active Load Timer'), name: 'Meter Active Load Timer Status', nodeId: 'ns=4;i=356', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status of the Active Load Timer.', category: 'status', factor: 1, phase: 'x', label: '', isWritable: false },
  { id: createId('Meter Operation Timer 1'), name: 'Meter Operation Timer 1 Status', nodeId: 'ns=4;i=357', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status of Operation Timer 1.', category: 'status', factor: 1, phase: 'x', label: '', isWritable: false },
  { id: createId('Meter Cycle Count Status'), name: 'Meter Cycle Count Status', nodeId: 'ns=4;i=358', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status related to cycle counting functionality.', category: 'status', factor: 1, phase: 'x', label: '', isWritable: false },

  // Inserted based on NodeId ns=4;i=391 (Log Time: 11:23:32)
{
  id: createId('Backup_Supply_Contactor_Switch_Out_M'),
  name: 'Backup Supply Contactor Switch Out M',
  nodeId: 'ns=4;i=391',
  dataType: 'Boolean',
  uiType: 'switch',
  icon: ToggleRight, // Or ToggleLeft, depending on desired representation for 'false'
  description: 'Status/Control for Backup Supply Contactor Switch Output M.',
  category: 'control',
  factor: 1,
  phase: 'x',
  label: 'Backup Supply Contactor', // Adjusted for potential UI display
  isWritable: true, // Assumed, as it's a switch
  // Add other ExtendedDataPoint fields if necessary, e.g., notes: 'OPC Description: Bad_AttributeIdInvalid'
},

// Inserted based on NodeId ns=4;i=392 (Log Time: 11:22:59)
{
  id: createId('Deye_Grid_Supply_switch_Out_M'),
  name: 'Deye Grid Supply Switch Out M',
  nodeId: 'ns=4;i=392',
  dataType: 'Boolean',
  uiType: 'switch',
  icon: ToggleRight,
  description: 'Status/Control for Deye Grid Supply Switch Output M.',
  category: 'control',
  factor: 1,
  phase: 'x',
  label: 'Deye Grid Supply Switch', // Adjusted for potential UI display
  isWritable: true,
},

// Inserted based on NodeId ns=4;i=393 (Log Time: 11:24:19)
{
  id: createId('Gen_Supply_M'),
  name: 'Generator Supply M',
  nodeId: 'ns=4;i=393',
  dataType: 'Boolean',
  uiType: 'switch',
  icon: ToggleRight,
  description: 'Status/Control for Generator Supply M.',
  category: 'control',
  factor: 1,
  phase: 'x',
  label: 'Generator Supply', // Adjusted
  isWritable: true,
},

// Inserted based on NodeId ns=4;i=394 (Log Time: 11:24:42)
{
  id: createId('Grid_Supply_M'),
  name: 'Grid Supply M',
  nodeId: 'ns=4;i=394',
  dataType: 'Boolean',
  uiType: 'switch',
  icon: ToggleRight,
  description: 'Status/Control for Grid Supply M.',
  category: 'control',
  factor: 1,
  phase: 'x',
  label: 'Grid Supply', // Adjusted
  isWritable: true,
},

// Inserted based on NodeId ns=4;i=395 (Log Time: 11:25:07)
{
  id: createId('Main_Grid_Supply_Switch_Out_M'),
  name: 'Main Grid Supply Switch Out M',
  nodeId: 'ns=4;i=395',
  dataType: 'Boolean',
  uiType: 'switch',
  icon: ToggleRight,
  description: 'Status/Control for Main Grid Supply Switch Output M.',
  category: 'status',
  factor: 1,
  phase: 'x',
  label: 'Main Grid Supply Switch', // Adjusted
  isWritable: true,
},

{
  id: createId('Deye Inverter Modbus Mode'),
  name: 'Deye Inverter Modbus Mode',
  nodeId: 'ns=4;i=397',
  dataType: 'Int16',
  uiType: 'display',
  icon: Info, // Assuming 'Info' icon is suitable for mode status
  description: 'Displays the current Modbus communication mode configured for the Deye inverter. The value is an integer code representing a specific mode.',
  category: 'status', // Categorized as control since it's a writable mode value
  factor: 1, // Default factor for Int16, assuming no scaling
  phase: 'x', // Not phase-specific
  label: '',    // Consistent with other data points' label initialization
  isWritable: true, // Derived from "WriteMask None" and "UserWriteMask None"
  notes: 'The OPC UA server reported "Bad_AttributeIdInvalid" for the Description attribute of this node. This means the server does not provide a textual description for this specific node path, but its Value (0 in example) should be readable. The value likely represents an enumeration code for different Modbus modes; check Deye documentation for code meanings.',
  // enumSet: { 0: 'Mode A', 1: 'Mode B', /* ... */ }, // Example: Add if enum codes are known
},
{
  id: createId('Goodwe Inverter Modbus Mode'),
  name: 'Goodwe Inverter Modbus Mode',
  nodeId: 'ns=4;i=398',
  dataType: 'Int16',
  uiType: 'display',
  icon: Info, // Assuming 'Info' icon is suitable for mode status
  description: 'Displays the current Modbus communication mode configured for the Goodwe inverter. The value is an integer code representing a specific mode.',
  category: 'control', // Categorized as control since it's a writable mode value
  factor: 1, // Default factor
  phase: 'x', // Not phase-specific
  label: '',    // Consistent with other data points
  isWritable: true, // Derived from "WriteMask None" and "UserWriteMask None"
  notes: 'The OPC UA server reported "Bad_AttributeIdInvalid" for the Description attribute of this node. This means the server does not provide a textual description for this specific node path, but its Value (0 in example) should be readable. The value likely represents an enumeration code for different Modbus modes; check Goodwe documentation for code meanings.',
  // enumSet: { 0: 'Mode X', 1: 'Mode Y', /* ... */ }, // Example: Add if enum codes are known
},
  
  // --- Simulation Data Points ---
  { id: 'sim_temp_1', name: 'Simulation Temperature', label: 'Simulation Temperature', nodeId: 'ns=2;s=SimTemp1', dataType: 'Float', unit: '°C', category: 'simulation', uiType: 'display', icon: Thermometer, isWritable: true },
  { id: 'sim_humidity_1', name: 'Simulation Humidity', label: 'Simulation Humidity', nodeId: 'ns=2;s=SimHumidity1', dataType: 'Float', unit: '%', category: 'simulation', uiType: 'display', icon: Activity, isWritable: true },
  { id: 'sim_pressure_1', name: 'Simulation Pressure', label: 'Simulation Pressure', nodeId: 'ns=2;s=SimPressure1', dataType: 'Float', unit: 'kPa', category: 'simulation', uiType: 'display', icon: Activity, isWritable: true },
  { id: 'sim_tank_level_1', name: 'Simulation Tank Level', label: 'Simulation Tank Level', nodeId: 'ns=2;s=SimTankLevel1', dataType: 'Float', unit: '%', category: 'simulation', uiType: 'display', icon: Gauge, isWritable: true }
];

// Export Node IDs for convenience if used by other parts of the application
export const nodeIds: string[] = dataPoints.map(dataPoint => dataPoint.nodeId);

/**
 * Example function to combine High/Low words.
 * IMPORTANT: Client-side combination of WORDs from OPC UA is complex and error-prone.
 * Relies on correct assumptions about endianness, signedness, and register order.
 * Prefer server-side combination or library features if available.
 * This example assumes Low Word is less significant, High Word is more significant,
 * and handles potential 32-bit signed conversion.
 *
 * @param high - The high word (16-bit value).
 * @param low - The low word (16-bit value).
 * @param isSigned - Whether the target 32-bit value should be treated as signed.
 * @returns A combined 32-bit number.
 */
export function combineWordsExample(high: number, low: number, isSigned: boolean = false): number {
  const lowUnsigned = low & 0xFFFF;
  const highUnsigned = high & 0xFFFF;
  let combined = (highUnsigned << 16) | lowUnsigned;

  if (isSigned && (combined & 0x80000000)) { // Check MSB for signed conversion
    combined = combined - 0x100000000; // Convert from 32-bit unsigned to JS signed number
  }
  return combined;
}


export interface BaseDataPointConfig {
    id: string;
    name: string;
    nodeId: string;
    label: string;
    dataType: DataPointConfig['dataType']; // Use the strict enum
    uiType: DataPointConfig['uiType'];   // Use the strict enum
    icon: IconComponentType;             // Store the component directly
    category: string;
    // Optional fields can be added here if needed during base conversion
    iconName?: string; // Storing original icon name string for edit modal
    unit?: string;
    min?: number;
    max?: number;
    description?: string;
    factor?: number;
    phase?: 'L1' | 'L2' | 'L3' | 'System' | 'Aggregate' | 'x';
    notes?: string;
    isWritable?: boolean;
    precision?: number;
    enumSet?: Record<number | string, string>;
}