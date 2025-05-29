// Import React for component types
import React from 'react';
import {
  // Keep specific icons used
  Battery, Zap, Activity, Gauge, AudioWaveform, Thermometer, Clock, Percent,
  Power, ToggleLeft, ToggleRight, AlertTriangle, Settings, Sigma, Waves,
  Minimize2, Maximize2, FileOutput, Waypoints, Info, SigmaSquare, Lightbulb, HelpCircle,
  // Explicitly type the expected icon component props
  LucideProps
} from 'lucide-react';

// Define a precise type for the icon components
export type IconComponentType = React.FC<React.SVGProps<SVGSVGElement>>;

// Base Lucide Icon Type (if needed for comparison or external use)
// export type LucideIconBaseType = import('lucide-react').LucideIcon; // Alternative if specific LucideIcon type is needed



export interface DataPoint {
  label: string;
  id: string; // Unique kebab-case identifier
  name: string; // Human-readable name
  nodeId: string; // OPC UA Node ID
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
  uiType: 'display' | 'button' | 'switch' | 'gauge'; // How to render in UI
  icon: IconComponentType; // Use the defined icon component type
  unit?: string; // Physical unit (V, A, W, kWh, %, Hz, °C, etc.)
  min?: number; // Minimum value for gauges/validation
  max?: number; // Maximum value for gauges/validation
  description?: string; // Tooltip or extra info
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase' | 'pv' | 'settings' | 'status' | 'energy' | 'simulation'; // Grouping
  factor?: number; // Multiplier for raw value (e.g., 0.1, 0.01, 0.001)
  phase?: 'a' | 'b' | 'c' | 'x'; // Phase identifier ('x' for non-phase specific or total)
  isSinglePhase?: boolean; // Hint for UI rendering
  threePhaseGroup?: string; // Link related phase items (e.g., 'grid-voltage')
  notes?: string; // Internal notes for clarification/TODOs
decimalPlaces?: number; 
}

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
  icon: IconComponentType; // Use the defined icon component type
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase' | 'pv' | 'settings' | 'status' | 'energy' | string; // Allow string for flexibility
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
    return ''; // Return empty string for invalid input
  }
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-_]+/g, '') // Remove disallowed characters, keeping underscores and hyphens
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // Replace multiple hyphens with single
};

export const dataPoints: DataPoint[] = [
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
    label: ''
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
    label: ''
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
    label: ''
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
    label: ''
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
    label: ''
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
    label: ''
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
    notes: 'Value likely needs specific decoding logic (e.g., High Byte = Year, Low Byte = Month).',
    label: ''
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
    notes: 'Value likely needs specific decoding logic.',
    label: ''
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
    notes: 'Value likely needs specific decoding logic.',
    label: ''
  },
  // --- Index 9 ---
  {
    id: 'active-power-adjust',
    name: 'Active Power Adjust',
    nodeId: 'ns=4;i=14',
    dataType: 'Int16',
    uiType: 'display', // Or gauge if adjustable with min/max
    icon: Settings,
    unit: '%',
    description: 'Active power output adjustment setting.',
    category: 'control',
    factor: 0.1,
    phase: 'x',
    label: ''
  },
  // --- Index 10 ---
  {
    id: 'pf-reactive-power-adjust',
    name: 'PF Reactive Power Adjust',
    nodeId: 'ns=4;i=15',
    dataType: 'Int16',
    uiType: 'display', // Or gauge
    icon: Settings,
    unit: '', // PF is unitless
    description: 'Power Factor or Reactive Power adjustment setting (PF mode). Value scaled by 1000.',
    category: 'control',
    factor: 0.001,
    phase: 'x',
    notes: 'Factor 0.001 for PF (e.g., 995 -> 0.995).',
    label: ''
  },
  // --- Index 11 ---
  {
    id: 'reactive-power-adjust',
    name: 'Reactive Power Adjust',
    nodeId: 'ns=4;i=16',
    dataType: 'Float', // Matched previous determination
    uiType: 'display', // Or gauge
    icon: Settings,
    unit: 'VAR',
    description: 'Reactive power output adjustment setting (absolute VAR).',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 12 ---
  {
    id: 'max-value-of-reactive-power',
    name: 'Max Value of Reactive Power',
    nodeId: 'ns=4;i=17',
    dataType: 'Float', // Matched previous determination
    uiType: 'display',
    icon: Maximize2,
    unit: 'VAR',
    description: 'Maximum allowed reactive power setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 13 ---
  {
    id: 'on-grid-export-power-limit-switch',
    name: 'On Grid Export Power Limit Switch',
    nodeId: 'ns=4;i=19',
    dataType: 'UInt16', // Keep as UInt16; application logic handles 0/1 as boolean state if needed
    uiType: 'switch',
    icon: ToggleRight, // Represents on/enabled state visually
    description: 'Enable/Disable the grid export power limitation feature.',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 14 ---
  {
    id: 'export-power-percentage',
    name: 'Export Power Percentage',
    nodeId: 'ns=4;i=20',
    dataType: 'Int16',
    uiType: 'display', // Or gauge
    icon: Percent,
    unit: '%',
    description: 'Set the export power limit as a percentage of rated power.',
    category: 'control',
    factor: 0.1,
    phase: 'x',
    label: ''
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
    label: ''
  },
  // --- Index 16 ---
  {
    id: 'error-message',
    name: 'Error Message Code',
    nodeId: 'ns=4;i=22',
    dataType: 'Int16', // Mapped from UInt32 assumption, within Int16 range
    uiType: 'display',
    icon: AlertTriangle,
    description: 'Current device error code. Value requires a lookup table for description.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Error code; needs interpretation via documentation or lookup table.',
    label: ''
  },
  // --- Index 17 & 18: Total Power Generation (32-bit combined) ---
  {
    id: 'high-byte-total-power-generation',
    name: 'High Word Total Power Generation',
    nodeId: 'ns=4;i=24',
    dataType: 'Int16', // Representing high word
    uiType: 'display',
    icon: Sigma,
    description: 'High word of the total generated power. Combine with low word (ns=4;i=25).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: ''
  },
  {
    id: 'low-byte-total-power-generation',
    name: 'Low Word Total Power Generation',
    nodeId: 'ns=4;i=25',
    dataType: 'Int16', // Representing low word (use UInt16 if value range requires)
    uiType: 'display',
    icon: Sigma,
    description: 'Low word of the total generated power. Combine with high word (ns=4;i=24).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD.',
    label: ''
  },
  // --- Index 19 & 20: Hourly Power Generation (32-bit combined) ---
  {
    id: 'high-byte-hourly-power-generation',
    name: 'High Word Hourly Power Generation',
    nodeId: 'ns=4;i=26',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap, // Using Zap for hourly "power" (energy in hour)
    description: 'High word of the energy generated in the current hour. Combine with low word (ns=4;i=27).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor for combined value TBD (likely Wh or kWh).',
    label: ''
  },
  {
    id: 'low-byte-hourly-power-generation',
    name: 'Low Word Hourly Power Generation',
    nodeId: 'ns=4;i=27',
    dataType: 'Int16', // Use UInt16 if needed
    uiType: 'display',
    icon: Zap,
    description: 'Low word of the energy generated in the current hour. Combine with high word (ns=4;i=26).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Part of a 32-bit value. Final unit/factor TBD.',
    label: ''
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
    label: ''
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
    label: ''
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
    label: ''
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
    label: ''
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
    category: 'three-phase' as DataPoint['category'],
    factor: 0.1,
    phase: ph as DataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: ''
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
    category: 'three-phase' as DataPoint['category'],
    factor: 0.1,
    phase: ph as DataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: ''
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
    category: 'three-phase' as DataPoint['category'],
    factor: 0.01,
    phase: ph as DataPoint['phase'],
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: ''
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
    factor: 1, // Assuming raw Watts; verify based on typical inverter output values.
    phase: 'x',
    notes: 'Original name "Pac L / inverter current" was ambiguous. Assumed Power output.',
    label: ''
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
    label: ''
  },
  {
    id: 'inverter-internal-temperature',
    name: 'Inverter Internal Temperature',
    nodeId: 'ns=4;i=43',
    dataType: 'Int16',
    uiType: 'display', // Or gauge
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature measured inside the inverter.',
    category: 'inverter',
    factor: 0.1,
    phase: 'x',
    label: ''
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
    factor: 0.1, // Assumes raw value is in units of 0.1 kWh. Verify.
    phase: 'x',
    notes: 'Factor 0.1 for kWh assumes raw value like 123 means 12.3 kWh. Verify unit.',
    label: ''
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
    category: 'three-phase' as DataPoint['category'], factor: 0.001,
    phase: ph as DataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-current-precise',
    label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-v-l${idx + 1}-precise`),
    name: `Grid Voltage L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${49 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Grid voltage of phase L${idx + 1} (high precision). Value scaled by 1000.`,
    category: 'three-phase' as DataPoint['category'], factor: 0.001,
    phase: ph as DataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`limit${idx + 1}-i-precise`),
    name: `Limit Current L${idx + 1} (Precise)`,
    nodeId: `ns=4;i=${52 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'],
    uiType: 'display' as DataPoint['uiType'],
    icon: Minimize2, unit: 'A',
    description: `Limit current setting/measurement for phase L${idx + 1} (high precision). Scaled by 1000.`,
    category: 'settings' as DataPoint['category'], factor: 0.001,
    phase: ph as DataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'limit-current-precise',
    label: ''
  })),
  // --- Precise PV Measurements (i=55 to i=58) ---
  {
    id: 'pv1-v-precise', name: 'PV1 Voltage (Precise)', nodeId: 'ns=4;i=55',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: ''
  },
  {
    id: 'pv1-i-precise', name: 'PV1 Current (Precise)', nodeId: 'ns=4;i=56',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 1 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: ''
  },
  {
    id: 'pv2-v-precise', name: 'PV2 Voltage (Precise)', nodeId: 'ns=4;i=57',
    dataType: 'Int16', uiType: 'display', icon: Zap, unit: 'V', category: 'pv',
    description: 'Input voltage from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for PV Voltage is unusual. Verify.', label: ''
  },
  {
    id: 'pv2-i-precise', name: 'PV2 Current (Precise)', nodeId: 'ns=4;i=58',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'pv',
    description: 'Input current from PV string 2 (high precision). Scaled by 1000.', factor: 0.001, phase: 'x', label: ''
  },
  // --- Precise Inverter Output Measurements (i=59 to i=64) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-i-precise`),
    name: `Inverter Current ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${59 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'A',
    description: `Inverter output current phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as DataPoint['category'], factor: 0.001,
    phase: ph as DataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-current-precise',
    label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`inv-${ph}-v-precise`),
    name: `Inverter Voltage ${ph.toUpperCase()} (Precise)`,
    nodeId: `ns=4;i=${62 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Waves, unit: 'V',
    description: `Inverter output voltage phase ${ph.toUpperCase()} (high precision). Scaled by 1000.`,
    category: 'three-phase' as DataPoint['category'], factor: 0.001,
    phase: ph as DataPoint['phase'], isSinglePhase: false, threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage is unusual. Verify scaling.', label: ''
  })),
  // --- Precise Battery Measurements (i=65, 66) ---
  {
    id: 'bat-i-precise', name: 'Battery Current (Precise)', nodeId: 'ns=4;i=65',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'A', category: 'battery',
    description: 'Battery current (high precision). Positive=charging, Negative=discharging. Scaled by 1000.', factor: 0.001, phase: 'x', label: ''
  },
  {
    id: 'bat-v-precise', name: 'Battery Voltage (Precise)', nodeId: 'ns=4;i=66',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'V', category: 'battery',
    description: 'Battery voltage (high precision). Scaled by 1000.', factor: 0.001, phase: 'x',
    notes: 'Factor 0.001 for Battery Voltage (e.g. 50000 for 50V) is unusual. Verify.', label: ''
  },
  // --- Continuation from Index 59 ---
  {
    id: 'max-solar-sell-power-setting', name: 'Max Solar Sell Power Setting', nodeId: 'ns=4;i=68',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'control', factor: 1, phase: 'x',
    description: 'Setting for the maximum power (in Watts) allowed to be sold to the grid from solar.',
    notes: 'Log source showed Boolean, reassessed as Int16 for power setting.', label: ''
  },
  {
    id: 'run-state', name: 'Run State Code', nodeId: 'ns=4;i=70',
    dataType: 'Int16', uiType: 'display', icon: Info, category: 'status', factor: 1, phase: 'x',
    description: 'Current operational state code of the inverter. Requires lookup table.',
    notes: 'Value needs interpretation via documentation or lookup table.', label: ''
  },
  {
    id: 'active-power-generation-today', name: 'Active Energy Generation Today', // Energy not power
    nodeId: 'ns=4;i=71',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kWh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total active energy generated today.',
    notes: 'Factor 0.1 for kWh. Verify raw unit.', label: ''
  },
  {
    id: 'reactive-power-generation-today', name: 'Reactive Energy Generation Today',
    nodeId: 'ns=4;i=72',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'kVARh', category: 'energy', factor: 0.1, phase: 'x',
    description: 'Total reactive energy generated today.',
    notes: 'Factor 0.1 for kVARh. Verify raw unit.', label: ''
  },
  {
    id: 'grid-connection-time-today', name: 'Grid Connection Time Today', nodeId: 'ns=4;i=73',
    dataType: 'Int16', uiType: 'display', icon: Clock, unit: 'min', category: 'status', factor: 1, phase: 'x',
    description: 'Total time the inverter has been connected to the grid today, in minutes.',
    notes: 'Assuming raw minutes.', label: ''
  },
  // --- Combined Lifetime Counters (i=74 to i=92) ---
  // Active Generation Total (i=74, 75)
  {
    id: 'active-power-gen-total-low-byte', name: 'Active Energy Gen Total (Low Word)',
    nodeId: 'ns=4;i=74', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime active energy generation. Combine with High word (ns=4;i=75).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: ''
  },
  {
    id: 'active-power-gen-total-high-byte', name: 'Active Energy Gen Total (High Word)',
    nodeId: 'ns=4;i=75', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime active energy generation. Combine with Low word (ns=4;i=74).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor for combined TBD.', label: ''
  },
  // Active Generation Total _1 (i=76, 77) - Purpose unclear
  {
    id: 'active-power-gen-total-low-byte-1', name: 'Active Energy Gen Total_1 (Low Word)',
    nodeId: 'ns=4;i=76', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of alternative total active energy generation counter. Combine with High word (ns=4;i=77).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  {
    id: 'active-power-gen-total-high-byte-1', name: 'Active Energy Gen Total_1 (High Word)',
    nodeId: 'ns=4;i=77', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of alternative total active energy generation counter. Combine with Low word (ns=4;i=76).',
    factor: 1, phase: 'x', notes: 'Purpose unclear. Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // Daily Battery Charge Energy (i=79)
  {
    id: 'day-battery-charge-energy', name: 'Day Battery Charge Energy', nodeId: 'ns=4;i=79',
    dataType: 'Int16', uiType: 'display', icon: Battery, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy charged into the battery today.',
    notes: 'Unit (Wh) assumed. Small value like 3 from log might mean kWh or different scaling.', label: ''
  },
  // Total Battery Charge (i=80, 81)
  {
    id: 'total-charge-battery-low-byte', name: 'Total Battery Charge Energy (Low Word)',
    nodeId: 'ns=4;i=80', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery charge energy. Combine with High word (ns=4;i=81).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?) /Factor TBD.', label: ''
  },
  {
    id: 'total-charge-battery-high-byte', name: 'Total Battery Charge Energy (High Word)',
    nodeId: 'ns=4;i=81', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery charge energy. Combine with Low word (ns=4;i=80).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // Total Battery Discharge (i=82, 83)
  {
    id: 'total-discharge-battery-low-byte', name: 'Total Battery Discharge Energy (Low Word)',
    nodeId: 'ns=4;i=82', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime battery discharge energy. Combine with High word (ns=4;i=83).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (kWh? Ah?)/Factor TBD.', label: ''
  },
  {
    id: 'total-discharge-battery-high-byte', name: 'Total Battery Discharge Energy (High Word)',
    nodeId: 'ns=4;i=83', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime battery discharge energy. Combine with Low word (ns=4;i=82).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // Daily Grid Energy (Buy/Sell, i=84, 85)
  {
    id: 'day-grid-buy-power-wh', name: 'Day Grid Buy Energy', nodeId: 'ns=4;i=84',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy bought from the grid today.', notes: 'Assumed raw Wh.', label: ''
  },
  {
    id: 'day-grid-sell-power-wh', name: 'Day Grid Sell Energy', nodeId: 'ns=4;i=85',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy sold to the grid today.', notes: 'Assumed raw Wh.', label: ''
  },
  // Total Grid Buy (i=86, 87)
  {
    id: 'total-grid-buy-power-wh-low-word', name: 'Total Grid Buy Energy (Low Word)',
    nodeId: 'ns=4;i=86', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid buy energy. Combine with High word (ns=4;i=87).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: ''
  },
  {
    id: 'total-grid-buy-power-wh-high-word', name: 'Total Grid Buy Energy (High Word)',
    nodeId: 'ns=4;i=87', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid buy energy. Combine with Low word (ns=4;i=86).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // Total Grid Sell (i=88, 89)
  {
    id: 'total-grid-sell-power-wh-low-word', name: 'Total Grid Sell Energy (Low Word)',
    nodeId: 'ns=4;i=88', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime grid sell energy. Combine with High word (ns=4;i=89).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: ''
  },
  {
    id: 'total-grid-sell-power-wh-high-word', name: 'Total Grid Sell Energy (High Word)',
    nodeId: 'ns=4;i=89', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime grid sell energy. Combine with Low word (ns=4;i=88).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // Daily Load Energy (i=90)
  {
    id: 'day-load-power-wh', name: 'Day Load Energy', nodeId: 'ns=4;i=90',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy consumed by the load today.', notes: 'Assumed raw Wh.', label: ''
  },
  // Total Load Energy (i=91, 92)
  {
    id: 'total-load-power-wh-low-word', name: 'Total Load Energy (Low Word)',
    nodeId: 'ns=4;i=91', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime load energy consumption. Combine with High word (ns=4;i=92).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: ''
  },
  {
    id: 'total-load-power-wh-high-word', name: 'Total Load Energy (High Word)',
    nodeId: 'ns=4;i=92', dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime load energy consumption. Combine with Low word (ns=4;i=91).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // --- Daily PV Energy (i=93 to i=97) ---
  {
    id: 'day-pv-power-wh', name: 'Day PV Total Energy', nodeId: 'ns=4;i=93',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Wh', category: 'energy', factor: 1, phase: 'x',
    description: 'Total energy generated from all PV inputs today.', notes: 'Assumed raw Wh.', label: ''
  },
  ...[1, 2, 3, 4].map(pvIdx => ({
    id: createId(`day-pv${pvIdx}-power-wh`),
    name: `Day PV${pvIdx} Energy`,
    nodeId: `ns=4;i=${93 + pvIdx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'],
    icon: Sigma, unit: 'Wh', category: 'energy' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
    description: `Total energy generated from PV input ${pvIdx} today ${pvIdx > 2 ? '(if applicable)' : ''}.`,
    notes: 'Assumed raw Wh.', label: ''
  })),
  // --- Total PV Energy (i=98, 99) ---
  {
    id: 'total-pv-power-wh-low-word', name: 'Total PV Energy (Low Word)', nodeId: 'ns=4;i=98',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'Low word of total lifetime PV energy generation. Combine with High word (ns=4;i=99).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit (Wh? kWh?)/Factor TBD.', label: ''
  },
  {
    id: 'total-pv-power-wh-high-word', name: 'Total PV Energy (High Word)', nodeId: 'ns=4;i=99',
    dataType: 'Int16', uiType: 'display', icon: Sigma, category: 'energy',
    description: 'High word of total lifetime PV energy generation. Combine with Low word (ns=4;i=98).',
    factor: 1, phase: 'x', notes: 'Part of 32-bit value. Unit/Factor TBD.', label: ''
  },
  // --- Temperatures (i=101, 102) ---
  {
    id: 'dc-transformer-temperature', name: 'DC Transformer Temperature', nodeId: 'ns=4;i=101',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: 0.1, phase: 'x',
    description: 'Temperature of the DC transformer component.', label: ''
  },
  {
    id: 'heat-sink-temperature', name: 'Heat Sink Temperature', nodeId: 'ns=4;i=102',
    dataType: 'Int16', uiType: 'display', icon: Thermometer, unit: '°C', category: 'inverter', factor: 0.1, phase: 'x',
    description: 'Temperature of the inverter heat sink.', label: ''
  },
  // --- Status Bits (i=104, 105) ---
  {
    id: 'on-off-status', name: 'On/Off Status', nodeId: 'ns=4;i=104',
    dataType: 'Boolean', uiType: 'display', icon: Power, category: 'status', factor: 1, phase: 'x',
    description: 'Indicates if the inverter is currently On (True/1) or Off (False/0).', label: ''
  },
  {
    id: 'ac-relay-status', name: 'AC Relay Status Code', nodeId: 'ns=4;i=105',
    dataType: 'Int16', uiType: 'display', icon: Waypoints, category: 'status', factor: 1, phase: 'x',
    description: 'Status code representing the state of the AC relay(s). Requires decoding.',
    notes: 'Value needs interpretation (bitmask or enum via documentation).', label: ''
  },
  // --- Warning/Fault Words (i=106 to i=111) ---
  // ...[...Array(2).keys()].map(k => ({ // Word 1, 2
  //   id: createId(`warning-message-word-${k + 1}`), name: `Warning Message Word ${k + 1}`, nodeId: `ns=4;i=${106 + k}`,
  //   dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: AlertTriangle, category: 'status' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
  //   description: `Warning status flags (Word ${k + 1}). Value is likely a bitmask needing decoding.`, notes: 'Bitmask; needs interpretation.', label: ''
  // })),
  // ...[...Array(4).keys()].map(k => ({ // Word 1, 2, 3, 4
  //   id: createId(`fault-information-word-${k + 1}`), name: `Fault Information Word ${k + 1}`, nodeId: `ns=4;i=${108 + k}`,
  //   dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: AlertTriangle, category: 'status' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
  //   description: `Fault status flags (Word ${k + 1}). Value is likely a bitmask needing decoding.`, notes: 'Bitmask; needs interpretation.', label: ''
  // })),
  // --- Battery Info (i=113 to i=115) ---
  {
    id: 'battery-temperature', name: 'Battery Temperature', nodeId: 'ns=4;i=113',
    dataType: 'Int16', uiType: 'gauge', icon: Thermometer, unit: '°C', category: 'battery', phase: 'x',
    min: -20, max: 70, description: 'Temperature of the battery. Scaled by (Raw / 4095) * 100.',
    factor: (1 / 4095) * 100, notes: 'Specific scaling. Verify calculation.', label: ''
  },
  {
    id: 'battery-voltage', name: 'Battery Voltage', nodeId: 'ns=4;i=114',
    dataType: 'Int16', uiType: 'gauge', icon: Battery, unit: 'V', category: 'battery', phase: 'x',
    min: 40, max: 58, description: 'Current battery voltage (e.g. raw 5163 -> 51.63V).', factor: 0.01, label: ''
  },
  {
    id: 'battery-capacity', name: 'Battery Capacity (SoC)', nodeId: 'ns=4;i=115',
    dataType: 'Int16', uiType: 'gauge', icon: Percent, unit: '%', category: 'battery', phase: 'x',
    min: 0, max: 99.9, description: 'Current battery State of Charge (SoC) (e.g. raw 100 -> 100%).', factor: 1, label: ''
  },
  // --- Placeholder and Battery Power/Current/AH (i=116 to i=119) ---
  {
    id: 'not-applicable-116', name: 'N/A (ns=4;i=116)', nodeId: 'ns=4;i=116',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=116.', notes: 'Marked N/A in source. Identify or hide.', label: ''
  },
  {
    id: 'battery-output-power', name: 'Battery Output Power', nodeId: 'ns=4;i=117',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'battery', factor: 1, phase: 'x',
    description: 'Current power flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -7 -> -7W).', label: ''
  },
  {
    id: 'battery-output-current', name: 'Battery Output Current', nodeId: 'ns=4;i=118',
    dataType: 'Int16', uiType: 'display', icon: Waves, unit: 'A', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Current flow from battery. Positive=Discharging, Negative=Charging (e.g. raw -15 -> -1.5A).', label: ''
  },
  {
    id: 'corrected-ah', name: 'Corrected AH', nodeId: 'ns=4;i=119',
    dataType: 'Int16', uiType: 'display', icon: Sigma, unit: 'Ah', category: 'battery', factor: 0.1, phase: 'x',
    description: 'Corrected Ampere-hour capacity or counter (e.g. raw 712 -> 71.2 Ah).', label: ''
  },
  // --- Grid Voltages (Detailed, i=121 to 126) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-voltage-${ph}`), name: `Grid Voltage Phase ${ph.toUpperCase()}`, nodeId: `ns=4;i=${121 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as DataPoint['category'], factor: 0.1, phase: ph as DataPoint['phase'],
    min: 180, max: 280, description: `Grid Phase ${ph.toUpperCase()} voltage measurement (e.g. raw 2360 -> 236.0V).`, isSinglePhase: false, threePhaseGroup: 'grid-voltage', label: ''
  })),
  ...['ab', 'bc', 'ca'].map((pair, idx) => ({
    id: createId(`grid-line-voltage-${pair}`), name: `Grid Line Voltage ${pair.toUpperCase()}`, nodeId: `ns=4;i=${124 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as DataPoint['category'], factor: 0.1, phase: 'x' as DataPoint['phase'],
    description: `Line-to-line voltage between grid phases ${pair.toUpperCase()}.`, isSinglePhase: false, threePhaseGroup: 'grid-line-voltage', label: ''
  })),
  // --- Grid Power Measurements (Inner/Side-to-Side/Apparent, i=127 to 133) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-inner-power-${ph}`), name: `Grid Inner Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${127 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
    description: `Power measured at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-inner-power', label: ''
  })),
  {
    id: 'grid-total-active-power-side-to-side', name: 'Total Active Power (Grid Side-to-Side)', nodeId: 'ns=4;i=130',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total active power flow across grid connection (e.g. raw -2076 -> -2076W).', label: ''
  },
  {
    id: 'grid-side-inner-total-apparent-power', name: 'Grid Side Inner Total Apparent Power', nodeId: 'ns=4;i=131',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'grid', factor: 1, phase: 'x',
    description: 'Total apparent power at inner grid connection.', notes: 'Assumed raw VA.', label: ''
  },
  {
    id: 'grid-side-frequency', name: 'Grid Side Frequency', nodeId: 'ns=4;i=132',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'grid', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Frequency at grid side connection (e.g. raw 5008 -> 50.08 Hz).', label: ''
  },
  // --- Grid Side Currents (Inner, i=133 to 135) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-inner-current-${ph}`), name: `Grid Side Inner Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${133 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as DataPoint['category'], factor: 0.01, phase: ph as DataPoint['phase'],
    description: `Current at inner grid connection, Phase ${ph.toUpperCase()} (e.g. raw 176 -> 1.76A).`, isSinglePhase: false, threePhaseGroup: 'grid-side-inner-current', label: ''
  })),
  // --- Off-Grid/Load Side Measurements (i=136 to 143) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-current-${ph}`), name: `Off-Grid Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${136 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as DataPoint['category'], factor: 0.01, phase: ph as DataPoint['phase'],
    description: `Current on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 641 -> 6.41A).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-current', notes: 'Factor 0.01 assumed.', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`out-of-grid-power-${ph}`), name: `Off-Grid Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${139 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
    description: `Power on load/backup side (off-grid), Phase ${ph.toUpperCase()} (e.g. raw 348 -> 348W).`, isSinglePhase: false, threePhaseGroup: 'out-of-grid-power', notes: 'Factor 1 assumed.', label: ''
  })),
  {
    id: 'out-of-grid-total-power', name: 'Off-Grid Total Power (Export)', nodeId: 'ns=4;i=142',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total power on load/backup side (off-grid capable) (e.g. raw 2086 -> 2086W).', notes: 'Factor 1 assumed.', label: ''
  },
  {
    id: 'out-of-grid-total-apparent-power', name: 'Off-Grid Total Apparent Power', nodeId: 'ns=4;i=143',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total apparent power on load/backup side (off-grid capable).', notes: 'Assumed raw VA.', label: ''
  },
  // --- Power Factor & Redundant Power/Misc (i=144 to 149) ---
  {
    id: 'grid-connected-power-factor', name: 'Grid Connected Power Factor', nodeId: 'ns=4;i=144',
    dataType: 'Int16', uiType: 'display', icon: SigmaSquare, unit: '', category: 'grid', factor: 0.01, phase: 'x',
    description: 'Overall power factor when connected to grid (e.g. raw 0 -> PF 0.00).', notes: 'Factor 0.01 assumes raw scaled by 100.', label: ''
  },
  ...['a', 'b', 'c'].map((ph, idx) => ({
    id: createId(`grid-side-${ph}-phase-power`), name: `Grid Side ${ph.toUpperCase()} Phase Power (Redundant?)`, nodeId: `ns=4;i=${145 + idx}`,
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
    description: `Power on grid side, Phase ${ph.toUpperCase()} (e.g. raw -328 -> -328W).`, isSinglePhase: false, threePhaseGroup: 'grid-side-power',
    notes: `Potentially redundant with grid-inner-power-${ph} (ns=4;i=${127 + idx}). Verify.`, label: ''
  })),
  {
    id: 'grid-side-total-power', name: 'Grid Side Total Power (Redundant?)', nodeId: 'ns=4;i=148',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total power on grid side (e.g. raw -2076 -> -2076W).',
    notes: 'Potentially redundant with grid-total-active-power-side-to-side (ns=4;i=130). Verify.', label: ''
  },
  {
    id: 'not-applicable-149', name: 'N/A (ns=4;i=149)', nodeId: 'ns=4;i=149',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=149.', notes: 'Marked N/A in source. Identify or hide.', label: ''
  },

  // --- Inverter Output Measurements (i=150 to i=161) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-voltage-${ph}`), name: `Inverter Output Phase Voltage ${ph.toUpperCase()}`, nodeId: `ns=4;i=${150 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as DataPoint['category'], factor: 0.1, phase: ph as DataPoint['phase'],
      description: `Output voltage from inverter, Phase ${ph.toUpperCase()} (e.g. raw 2365 -> 236.5V).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-voltage', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-current-${ph}`), name: `Inverter Output Phase Current ${ph.toUpperCase()}`, nodeId: `ns=4;i=${153 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'three-phase' as DataPoint['category'], factor: 0.01, phase: ph as DataPoint['phase'],
      description: `Output current from inverter, Phase ${ph.toUpperCase()} (e.g. raw 790 -> 7.90A).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-current', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`inverter-output-phase-power-${ph}`), name: `Inverter Output Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${156 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
      description: `Output power from inverter, Phase ${ph.toUpperCase()} (e.g. raw 1890 -> 1890W).`, isSinglePhase: false, threePhaseGroup: 'inverter-output-power', label: ''
  })),
  {
    id: 'inverter-output-total-power', name: 'Inverter Output Total Power', nodeId: 'ns=4;i=159',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total active power output from inverter (e.g. raw 5438 -> 5438W).', label: ''
  },
  {
    id: 'inverter-output-total-apparent-power', name: 'Inverter Output Total Apparent Power', nodeId: 'ns=4;i=160',
    dataType: 'Int16', uiType: 'display', icon: Power, unit: 'VA', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total apparent power output from inverter (e.g. raw 5438 -> 5438VA).', notes: 'If W and VA match, implies PF=1 or specific calculation.', label: ''
  },
  {
    id: 'inverter-frequency', name: 'Inverter Frequency', nodeId: 'ns=4;i=161',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'inverter', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Output frequency of the inverter (e.g. raw 5008 -> 50.08 Hz).', label: ''
  },

  // --- UPS/Load Side Power (i=162 to i=166) ---
  {
    id: 'not-applicable-162', name: 'N/A_1 (ns=4;i=162)', nodeId: 'ns=4;i=162',
    dataType: 'Int16', uiType: 'display', icon: HelpCircle, category: 'status', factor: 1, phase: 'x',
    description: 'Unidentified data point at ns=4;i=162.', notes: 'Marked N/A_1 in source. Identify or hide.', label: ''
  },
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`ups-load-side-phase-power-${ph}`), name: `UPS Load-Side Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${163 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Lightbulb, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
      description: `Power on UPS/backup output load, Phase ${ph.toUpperCase()} (e.g. raw 1562 -> 1562W).`, isSinglePhase: false, threePhaseGroup: 'ups-load-power', label: ''
  })),
  {
    id: 'ups-load-side-total-power', name: 'UPS Load-Side Total Power', nodeId: 'ns=4;i=166',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'W', category: 'inverter', factor: 1, phase: 'x',
    description: 'Total power on UPS/backup output load (e.g. raw 3362 -> 3362W).', label: ''
  },

  // --- Load Measurements (Voltage, Current[unused], Power, Apparent Power, Freq) (i=167 to 178) ---
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-voltage-${ph}`), name: `Load Phase Voltage ${ph.toUpperCase()}`, nodeId: `ns=4;i=${167 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'V', category: 'three-phase' as DataPoint['category'], factor: 0.1, phase: ph as DataPoint['phase'],
      description: `Voltage at load terminals, Phase ${ph.toUpperCase()} (e.g. raw 2374 -> 237.4V).`, isSinglePhase: false, threePhaseGroup: 'load-voltage', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-current-${ph}-no-use`), name: `Load Phase Current ${ph.toUpperCase()} (no use)`, nodeId: `ns=4;i=${170 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: HelpCircle, unit: 'A', category: 'status' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
      description: `Load phase current ${ph.toUpperCase()} - marked as not used.`, notes: 'Marked "no use"; verify or hide.', label: ''
  })),
  ...['a', 'b', 'c'].map((ph, idx) => ({
      id: createId(`load-phase-power-${ph}`), name: `Load Phase Power ${ph.toUpperCase()}`, nodeId: `ns=4;i=${173 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Lightbulb, unit: 'W', category: 'three-phase' as DataPoint['category'], factor: 1, phase: ph as DataPoint['phase'],
      description: `Power consumed by load, Phase ${ph.toUpperCase()} (e.g. raw 1562 -> 1562W).`, isSinglePhase: false, threePhaseGroup: 'load-power', label: ''
  })),
  {
    id: 'load-total-power', name: 'Total Load Power', nodeId: 'ns=4;i=176',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'W', category: 'grid', factor: 1, phase: 'x',
    description: 'Total active power consumed by the load (e.g. raw 3362 -> 3362W).', notes: 'Verify raw value means Watts.', label: ''
  },
  {
    id: 'load-total-apparent-power', name: 'Load Total Apparent Power', nodeId: 'ns=4;i=177',
    dataType: 'Int16', uiType: 'display', icon: Lightbulb, unit: 'VA', category: 'grid', factor: 1, phase: 'x',
    description: 'Total apparent power consumed by load (e.g. raw 3362 -> 3362VA).', notes: 'Log name mentioned "undefine cal". Verify calculation if needed.', label: ''
  },
  {
    id: 'load-frequency', name: 'Load Frequency', nodeId: 'ns=4;i=178',
    dataType: 'Int16', uiType: 'gauge', icon: AudioWaveform, unit: 'Hz', category: 'grid', factor: 0.01, phase: 'x',
    min: 49.0, max: 51.0, description: 'Frequency measured at load terminals (e.g. raw 5008 -> 50.08 Hz).', label: ''
  },

  // --- PV Input Powers & DC Measurements (i=180 to 191) ---
  ...[1, 2, 3, 4].map(pvIdx => ({
    id: createId(`input-power-pv${pvIdx}`), name: `Input Power PV${pvIdx}`, nodeId: `ns=4;i=${179 + pvIdx}`, // Corrected start index
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Power, unit: 'W', category: 'pv' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
    description: `Instantaneous power from PV input ${pvIdx} ${pvIdx > 2 ? '(if applicable)' : ''}.`, notes: 'Factor 1 assumes raw Watts.', label: ''
  })),
  ...[1, 2, 3, 4].map(dcIdx => ({
    id: createId(`dc-voltage-${dcIdx}`), name: `DC Voltage ${dcIdx} (PV${dcIdx}?)`, nodeId: `ns=4;i=${183 + dcIdx * 2 - 1}`, // Indices 184, 186, 188, 190
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Zap, unit: 'V', category: 'pv' as DataPoint['category'], factor: 0.1, phase: 'x' as DataPoint['phase'],
    description: `DC voltage measurement point ${dcIdx}${dcIdx <= 2 ? ` (likely PV${dcIdx} input, e.g. raw 3845->384.5V)` : ' (if applicable)'}.`, notes: `Potentially redundant with vpv${dcIdx} / vpv${dcIdx}-precise. Verify source.`, label: ''
  })),
  ...[1, 2, 3, 4].map(dcIdx => ({
    id: createId(`dc-current-${dcIdx}`), name: `DC Current ${dcIdx} (PV${dcIdx}?)`, nodeId: `ns=4;i=${183 + dcIdx * 2}`, // Indices 185, 187, 189, 191
    dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Waves, unit: 'A', category: 'pv' as DataPoint['category'], factor: 0.1, phase: 'x' as DataPoint['phase'],
    description: `DC current measurement point ${dcIdx}${dcIdx <= 2 ? ` (likely PV${dcIdx} input, e.g. raw 124->12.4A)` : ' (if applicable)'}.`, notes: `Potentially redundant with ipv${dcIdx} / ipv${dcIdx}-precise. Verify source.`, label: ''
  })),

  // --- Control / Battery Settings (i=193 to 215) ---
   {
    id: 'control-mode', name: 'Control Mode Code', nodeId: 'ns=4;i=193',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'control', factor: 1, phase: 'x',
    description: 'Current battery/system control mode code. Requires lookup table.', notes: 'Value needs interpretation via lookup.', label: ''
  },
  {
    id: 'equalization-v', name: 'Equalization Voltage Setting', nodeId: 'ns=4;i=194',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured equalization charge voltage (e.g. raw 5720 -> 57.20V).', label: ''
  },
  {
    id: 'absorption-v', name: 'Absorption Voltage Setting', nodeId: 'ns=4;i=195',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured absorption charge voltage (e.g. raw 5720 -> 57.20V).', label: ''
  },
  {
    id: 'float-v', name: 'Float Voltage Setting', nodeId: 'ns=4;i=196',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured float charge voltage (e.g. raw 5525 -> 55.25V).', label: ''
  },
  {
    id: 'batt-capacity-setting', name: 'Battery Capacity Setting', nodeId: 'ns=4;i=197',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'Ah', category: 'settings', factor: 1, phase: 'x',
    description: 'Configured nominal battery capacity.', notes: 'Factor 1 -> 1000 means 1000Ah. Verify scaling (0.1 for 100.0Ah?).', label: ''
  },
  {
    id: 'empty-v', name: 'Empty Voltage Setting (Cutoff)', nodeId: 'ns=4;i=198',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Configured battery voltage considered empty (cutoff) (e.g. raw 4500 -> 45.00V).', label: ''
  },
  {
    id: 'zero-export-power-setting', name: 'Zero Export Power Setting', nodeId: 'ns=4;i=199',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
    description: 'Power threshold setting for zero export control (e.g. raw 20 -> 20W).', label: ''
  },
  {
    id: 'equalization-day-cycle', name: 'Equalization Day Cycle', nodeId: 'ns=4;i=200',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'days', category: 'settings', factor: 1, phase: 'x',
    description: 'Frequency of equalization charge in days (e.g. raw 90 -> 90 days).', label: ''
  },
  {
    id: 'equalization-time', name: 'Equalization Time Setting', nodeId: 'ns=4;i=201',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'min', category: 'settings', factor: 1, phase: 'x',
    description: 'Duration of equalization charge in minutes.', notes: 'Assumed raw minutes.', label: ''
  },
  {
    id: 'tempco', name: 'TEMPCO Setting', nodeId: 'ns=4;i=283', // Renumbered i=185 -> i=283
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'mV/°C/Cell', category: 'settings', factor: 1, phase: 'x',
    description: 'Battery temperature compensation coefficient setting.', notes: 'Unit/factor need verification.', label: ''
  },
  {
    id: 'max-a-charge-battery-setting', name: 'Max Charge Current Setting', nodeId: 'ns=4;i=284', // Renumbered i=186 -> i=284
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum allowed battery charging current (e.g. raw 200 -> 20.0A).', label: ''
  },
  {
    id: 'max-a-discharge-battery-setting', name: 'Max Discharge Current Setting', nodeId: 'ns=4;i=285', // Renumbered i=187 -> i=285
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum allowed battery discharging current (e.g. raw 195 -> 19.5A).', label: ''
  },
  {
    id: 'lithium-battery-wakeup-sign-bit', name: 'Lithium Battery Wakeup Signal Status', nodeId: 'ns=4;i=203', // i=188
    dataType: 'Boolean', uiType: 'display', icon: Activity, category: 'status', factor: 1, phase: 'x',
    description: 'Status bit indicating Lithium battery wakeup signal.', label: ''
  },
  {
    id: 'battery-resistance-value', name: 'Battery Resistance Value', nodeId: 'ns=4;i=204', // i=189
    dataType: 'Int16', uiType: 'display', icon: Gauge, unit: 'mΩ', category: 'battery', factor: 1, phase: 'x',
    description: 'Measured or calculated internal battery resistance (e.g. raw 25 -> 25mΩ).', notes: 'Unit (mΩ) and factor (1) assumed.', label: ''
  },
  {
    id: 'battery-charging-efficiency-setting', name: 'Battery Charging Efficiency Setting', nodeId: 'ns=4;i=205', // i=190
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Configured battery charging efficiency (e.g. raw 990 -> 99.0%).', label: ''
  },
  {
    id: 'battery-capacity-shutdown-setting', name: 'Capacity Shutdown Setting (%)', nodeId: 'ns=4;i=206', // i=191
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to trigger shutdown (e.g. raw 20 -> 20%).', label: ''
  },
  {
    id: 'battery-capacity-restart-setting', name: 'Capacity Restart Setting (%)', nodeId: 'ns=4;i=207', // i=192
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to allow restart after shutdown (e.g. raw 50 -> 50%).', label: ''
  },
  {
    id: 'battery-capacity-low-battery-setting', name: 'Capacity Low Battery Setting (%)', nodeId: 'ns=4;i=208', // i=193
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'SoC (%) threshold to indicate low battery warning (e.g. raw 20 -> 20%).', label: ''
  },
  {
    id: 'battery-voltage-shutdown-setting', name: 'Voltage Shutdown Setting', nodeId: 'ns=4;i=209', // i=194
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to trigger shutdown (e.g. raw 4600 -> 46.00V).', label: ''
  },
  {
    id: 'battery-voltage-restart-setting', name: 'Voltage Restart Setting', nodeId: 'ns=4;i=210', // i=195
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to allow restart after shutdown (e.g. raw 5200 -> 52.00V).', label: ''
  },
  {
    id: 'battery-voltage-low-battery-setting', name: 'Voltage Low Battery Setting', nodeId: 'ns=4;i=211', // i=196
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold to indicate low battery warning (e.g. raw 4750 -> 47.50V).', label: ''
  },
  {
    id: 'grid-charging-start-voltage-point-setting', name: 'Grid Charging Start Voltage Setting', nodeId: 'ns=4;i=213', // i=197
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'V', category: 'settings', factor: 0.01, phase: 'x',
    description: 'Battery voltage threshold below which grid charging can start (e.g. raw 4900 -> 49.00V).', label: ''
  },
  {
    id: 'grid-charging-start-capacity-point-setting', name: 'Grid Charging Start Capacity Setting', nodeId: 'ns=4;i=214', // i=198
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: '%', category: 'settings', factor: 1, phase: 'x',
    description: 'Battery SoC (%) threshold below which grid charging can start (e.g. raw 40 -> 40%).', label: ''
  },
  {
    id: 'grid-charge-battery-current-setting', name: 'Grid Charge Battery Current Setting', nodeId: 'ns=4;i=215', // i=199
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'A', category: 'settings', factor: 0.1, phase: 'x',
    description: 'Maximum current allowed when charging battery from grid (e.g. raw 40 -> 4.0A).', label: ''
  },

  // --- Items from Index 200 onwards ---
  {
    id: createId('Grid Charged Enable'), name: 'Grid Charged Enable Status/Setting', nodeId: 'ns=4;i=217',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Indicates if charging from the grid is enabled or currently allowed.', notes: 'Verify if read-only or writable (0=Disabled, 1=Enabled).', label: ''
  },
  {
    id: createId('AC Couple'), name: 'AC Couple Setting/Status', nodeId: 'ns=4;i=218',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'AC Coupling feature setting or status (e.g., Enabled/Disabled).', notes: 'Verify if read-only or writable.', label: ''
  },
  {
    id: createId('Energy Management model'), name: 'Energy Management Model Code', nodeId: 'ns=4;i=220',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Selected Energy Management strategy model code.', notes: 'Value requires lookup.', label: ''
  },
  {
    id: createId('Limit Control function'), name: 'Limit Control Function Switch', nodeId: 'ns=4;i=221',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable the Limit Control function (e.g., export/import limits).', label: ''
  },
  {
    id: createId('Limit max grid power output'), name: 'Max Grid Power Output Limit Setting', nodeId: 'ns=4;i=222',
    dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'control', factor: 1, phase: 'x',
    description: 'Setting for maximum power output allowed to the grid.', notes: 'Unit (W) / factor (1) assumed. Verify scaling.', label: ''
  },
  // i=223 omitted if unknown
  {
    id: createId('Solar sell enable'), name: 'Solar Sell Enable Switch', nodeId: 'ns=4;i=224',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable selling solar power to the grid.', label: ''
  },
  {
    id: createId('Time of use selling enabled'), name: 'Time of Use Selling Enabled Switch', nodeId: 'ns=4;i=225',
    dataType: 'Int16', uiType: 'switch', icon: ToggleRight, category: 'control', factor: 1, phase: 'x',
    description: 'Enable/Disable selling power based on Time of Use (TOU) schedule.', label: ''
  },
  {
    id: createId('Grid Phase setting'), name: 'Grid Phase Setting Code', nodeId: 'ns=4;i=226',
    dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
    description: 'Configured grid phase type code (e.g., 1=Single, 3=Three).', notes: 'Value requires lookup.', label: ''
  },
  // --- Time of Use Settings (Bulk generated, i=227 to 256) ---
  // Use Array.from() for iteration safety
  // Sell Mode Time Points (i=227 to 232)
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode time point ${idx + 1}`),
      name: `TOU Sell Mode Time Point ${idx + 1}`,
      nodeId: `ns=4;i=${227 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Clock,
      description: `Time of Use (TOU) - Sell Mode Time Point ${idx + 1} Setting (HHMM).`,
      category: 'settings' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
      notes: 'Value likely encoded as HHMM. Needs decoding.', label: ''
  })),
  // Sell Mode Power Settings (i=233 to 238)
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode power ${idx + 1}`),
      name: `TOU Sell Mode Power Setting ${idx + 1}`,
      nodeId: `ns=4;i=${233 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: 'W',
      description: `Time of Use (TOU) - Power Setting (Watts) for Time Point ${idx + 1}.`,
      category: 'settings' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
      notes: 'Unit (W) / factor (1) assumed.', label: ''
  })),
  // Sell Mode Voltage Settings (i=239 to 244)
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode voltage ${idx + 1}`),
      name: `TOU Sell Mode Voltage Setting ${idx + 1}`,
      nodeId: `ns=4;i=${239 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: 'V',
      description: `Time of Use (TOU) - Voltage Limit/Target for Time Point ${idx + 1}.`,
      category: 'settings' as DataPoint['category'], factor: 0.1, phase: 'x' as DataPoint['phase'],
      notes: 'Purpose (limit/target?), unit (V), factor (0.1) assumed.', label: ''
  })),
  // Sell Mode SoC Settings (i=245 to 250)
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Sell mode capacity ${idx + 1}`),
      name: `TOU Sell Mode SoC Setting ${idx + 1}`,
      nodeId: `ns=4;i=${245 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], uiType: 'display' as DataPoint['uiType'], icon: Settings, unit: '%',
      description: `Time of Use (TOU) - Battery SoC Limit/Target for Time Point ${idx + 1}.`,
      category: 'settings' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
      notes: 'Purpose (limit/target?), unit (%) assumed.', label: ''
  })),
  // Charge Mode Enable Settings (i=251 to 256)
  ...Array.from(Array(6).keys()).map((idx) => ({
      id: createId(`Charge mode enable ${idx + 1}`),
      name: `TOU Charge Mode Enable Setting ${idx + 1}`,
      nodeId: `ns=4;i=${251 + idx}`,
      dataType: 'Int16' as DataPoint['dataType'], // Likely 0/1
      uiType: 'switch' as DataPoint['uiType'], icon: ToggleRight,
      description: `Time of Use (TOU) - Enable charging during Time Point ${idx + 1}.`,
      category: 'settings' as DataPoint['category'], factor: 1, phase: 'x' as DataPoint['phase'],
      label: ''
  })),

  // --- Remaining settings/status from i=258 onwards ---
  {
      id: createId('Grid Mode'), name: 'Grid Mode Code', nodeId: 'ns=4;i=258',
      dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
      description: 'Current grid interaction mode code.', notes: 'Requires lookup table.', label: ''
  },
  {
      id: createId('Grid Frequency Setting'), name: 'Grid Frequency Setting', nodeId: 'ns=4;i=259',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Configured nominal grid frequency (e.g., 50Hz, 60Hz).', notes: 'Factor 0.01 assumes raw 5000/6000. Verify.', label: ''
  },
  {
      id: createId('Grid Type Setting'), name: 'Grid Type Setting Code', nodeId: 'ns=4;i=260',
      dataType: 'Int16', uiType: 'display', icon: Settings, category: 'settings', factor: 1, phase: 'x',
      description: 'Configured grid type code (e.g., TN, TT, IT).', notes: 'Requires lookup table.', label: ''
  },
  {
      id: createId('Grid Voltage High Limit Setting Alt'), name: 'Grid Voltage High Limit Setting (Alt)', nodeId: 'ns=4;i=261',
      dataType: 'Int16', uiType: 'display', icon: Maximize2, unit: 'V', category: 'settings', factor: 0.1, phase: 'x',
      description: 'Alternative upper voltage limit setting for grid connection.', notes: 'Potentially redundant with i=6.', label: ''
  },
  {
      id: createId('Grid Voltage Low Limit Setting Alt'), name: 'Grid Voltage Low Limit Setting (Alt)', nodeId: 'ns=4;i=262',
      dataType: 'Int16', uiType: 'display', icon: Minimize2, unit: 'V', category: 'settings', factor: 0.1, phase: 'x',
      description: 'Alternative lower voltage limit setting for grid connection.', notes: 'Potentially redundant with i=5.', label: ''
  },
  {
      id: createId('Grid Hz High Limit Setting Alt'), name: 'Grid Frequency High Limit Setting (Alt)', nodeId: 'ns=4;i=263',
      dataType: 'Int16', uiType: 'display', icon: Maximize2, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Alternative upper frequency limit setting for grid connection.', notes: 'Potentially redundant with i=8.', label: ''
  },
  {
      id: createId('Grid Hz Low Limit Setting Alt'), name: 'Grid Frequency Low Limit Setting (Alt)', nodeId: 'ns=4;i=264',
      dataType: 'Int16', uiType: 'display', icon: Minimize2, unit: 'Hz', category: 'settings', factor: 0.01, phase: 'x',
      description: 'Alternative lower frequency limit setting for grid connection.', notes: 'Potentially redundant with i=7.', label: ''
  },
  {
      id: createId('Generator connected to grid input'), name: 'Generator Connected Status/Setting', nodeId: 'ns=4;i=265',
      dataType: 'Int16', uiType: 'display', icon: Power, category: 'settings', factor: 1, phase: 'x',
      description: 'Indicates if a generator is connected to the grid input terminal.', notes: 'Verify if status or setting.', label: ''
  },
  {
      id: createId('Generator peak shaving power'), name: 'Generator Peak Shaving Power Setting', nodeId: 'ns=4;i=266',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
      description: 'Power setting for generator peak shaving.', notes: 'Unit (W)/factor (1) assumed.', label: ''
  },
  {
      id: createId('Grid peak shaving Power'), name: 'Grid Peak Shaving Power Setting', nodeId: 'ns=4;i=267',
      dataType: 'Int16', uiType: 'display', icon: Settings, unit: 'W', category: 'settings', factor: 1, phase: 'x',
      description: 'Power setting for grid peak shaving.', notes: 'Unit (W)/factor (1) assumed.', label: ''
  },
  {
      id: createId('UPS Delay time'), name: 'UPS Delay Time Setting', nodeId: 'ns=4;i=269',
      dataType: 'Int16', uiType: 'display', icon: Clock, unit: 's', category: 'settings', factor: 1, phase: 'x',
      description: 'Delay time setting (seconds) for UPS/backup transition.', notes: 'Unit (s)/factor (1) assumed.', label: ''
  },

  // --- BMS Communication Data (i=270 to 282, already detailed above near indices 185-196 as node IDs were reassigned) ---
  // Entries already exist for 270-282 using createId based on log names
  // Ensure the node IDs match 270..279, 281, 282 - checked these are correct in the list already

  // --- Remote Commands/Status (i=287 onwards) ---
  // Commands 287, 288, 289 already exist above
  // --- Meter Data (i=291 onwards) ---
  // Bulk created using Array.from above for currents (291-300), voltages (301-317), power (318-329), unused(330-337), PF (338-345), freq (346)
  // Commands (348-366, with gaps/reserved) - use Array.from where appropriate
  { id: createId('Remote Start Key'), name: 'CMD: Remote Start', nodeId: 'ns=4;i=348', dataType: 'Boolean', uiType: 'button', icon: Power, description: 'Remote command to start operation.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Stop Key'), name: 'CMD: Remote Stop', nodeId: 'ns=4;i=349', dataType: 'Boolean', uiType: 'button', icon: Power, description: 'Remote command to stop operation.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Test Key'), name: 'CMD: Remote Test', nodeId: 'ns=4;i=350', dataType: 'Boolean', uiType: 'button', icon: Activity, description: 'Remote command to initiate a test sequence.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Auto Key'), name: 'CMD: Remote Auto Mode', nodeId: 'ns=4;i=351', dataType: 'Boolean', uiType: 'button', icon: Settings, description: 'Remote command to enable Auto mode.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Manual Key'), name: 'CMD: Remote Manual Mode', nodeId: 'ns=4;i=352', dataType: 'Boolean', uiType: 'button', icon: Settings, description: 'Remote command to enable Manual mode.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Mains C-O Key'), name: 'CMD: Remote Mains C/O', nodeId: 'ns=4;i=353', dataType: 'Boolean', uiType: 'button', icon: Waypoints, description: 'Remote command related to Mains changeover/connection.', category: 'control', factor: 1, phase: 'x', notes: 'C/O needs clarification. Write-only.', label: '' },
  { id: createId('Remote Gen C-O Key'), name: 'CMD: Remote Generator C/O', nodeId: 'ns=4;i=354', dataType: 'Boolean', uiType: 'button', icon: Waypoints, description: 'Remote command related to Generator changeover/connection.', category: 'control', factor: 1, phase: 'x', notes: 'C/O needs clarification. Write-only.', label: '' },
  { id: createId('Remote Up Key'), name: 'CMD: Remote Up', nodeId: 'ns=4;i=355', dataType: 'Boolean', uiType: 'button', icon: Activity, description: 'Remote command simulating an "Up" button press.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Down Key'), name: 'CMD: Remote Down', nodeId: 'ns=4;i=356', dataType: 'Boolean', uiType: 'button', icon: Activity, description: 'Remote command simulating a "Down" button press.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Reserved i357'), name: 'Reserved (ns=4;i=357)', nodeId: 'ns=4;i=357', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved.', label: '' },
  { id: createId('Reserved 1 i358'), name: 'Reserved_1 (ns=4;i=358)', nodeId: 'ns=4;i=358', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 1.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_1.', label: '' },
  { id: createId('Remote Confirm Key'), name: 'CMD: Remote Confirm', nodeId: 'ns=4;i=359', dataType: 'Boolean', uiType: 'button', icon: Activity, description: 'Remote command simulating a "Confirm/Enter" button press.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  { id: createId('Remote Mute Key'), name: 'CMD: Remote Mute', nodeId: 'ns=4;i=360', dataType: 'Boolean', uiType: 'button', icon: Activity, description: 'Remote command simulating a "Mute" button press.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  // i=361, 362 are reserved
  { id: createId('Reserved 2 i361'), name: 'Reserved_2 (ns=4;i=361)', nodeId: 'ns=4;i=361', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 2.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_2.', label: '' },
  { id: createId('Reserved 3 i362'), name: 'Reserved_3 (ns=4;i=362)', nodeId: 'ns=4;i=362', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 3.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_3.', label: '' },
  { id: createId('Remote Oil Engine Fast Stop'), name: 'CMD: Remote Oil Engine Fast Stop', nodeId: 'ns=4;i=363', dataType: 'Boolean', uiType: 'button', icon: AlertTriangle, description: 'Remote command for fast stop of an oil engine.', category: 'control', factor: 1, phase: 'x', notes: 'Write-only.', label: '' },
  // i=364, 365, 366 are reserved
  { id: createId('Reserved 4 i364'), name: 'Reserved_4 (ns=4;i=364)', nodeId: 'ns=4;i=364', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 4.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_4.', label: '' },
  { id: createId('Reserved 5 i365'), name: 'Reserved_5 (ns=4;i=365)', nodeId: 'ns=4;i=365', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 5.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_5.', label: '' },
  { id: createId('Reserved 6 i366'), name: 'Reserved_6 (ns=4;i=366)', nodeId: 'ns=4;i=366', dataType: 'Boolean', uiType: 'display', icon: HelpCircle, description: 'Reserved data point 6.', category: 'status', factor: 1, phase: 'x', notes: 'Reserved_6.', label: '' },
  // Output Ports (367-372) - Bulk generated above using Array.from
  // Meter RTC (374-380) - Bulk generated above using Array.from
  // Meter Status (382-384)
  { id: createId('Meter Active Load Timer'), name: 'Meter Active Load Timer Status', nodeId: 'ns=4;i=382', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status of the Active Load Timer.', category: 'status', factor: 1, phase: 'x', label: '' },
  { id: createId('Meter Operation Timer 1'), name: 'Meter Operation Timer 1 Status', nodeId: 'ns=4;i=383', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status of Operation Timer 1.', category: 'status', factor: 1, phase: 'x', label: '' },
  { id: createId('Meter Cycle Count Status'), name: 'Meter Cycle Count Status', nodeId: 'ns=4;i=384', dataType: 'Boolean', uiType: 'display', icon: Info, description: 'External Meter - Status related to cycle counting functionality.', category: 'status', factor: 1, phase: 'x', label: '' },
  // Meter Energy (386-397) - Bulk generated above using Array.from
  // Meter Reset Timestamp (399) - Generated above
  // Meter Alt Energy (400-411) - Bulk generated above using Array.from
  // Meter Demand (413-416) - Generated above
  // Placeholder (346_placeholder) - Generated above
  { id: 'sim_temp_1', name: 'Simulation Temperature', label: 'Simulation Temperature', nodeId: 'ns=2;s=SimTemp1', dataType: 'Float', unit: '°C', category: 'simulation', uiType: 'display', icon: Thermometer },
  { id: 'sim_humidity_1', name: 'Simulation Humidity', label: 'Simulation Humidity', nodeId: 'ns=2;s=SimHumidity1', dataType: 'Float', unit: '%', category: 'simulation', uiType: 'display', icon: Activity },
  { id: 'sim_pressure_1', name: 'Simulation Pressure', label: 'Simulation Pressure', nodeId: 'ns=2;s=SimPressure1', dataType: 'Float', unit: 'kPa', category: 'simulation', uiType: 'display', icon: Activity },
  { id: 'sim_tank_level_1', name: 'Simulation Tank Level', label: 'Simulation Tank Level', nodeId: 'ns=2;s=SimTankLevel1', dataType: 'Float', unit: '%', category: 'simulation', uiType: 'display', icon: Gauge }
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