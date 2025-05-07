import {
  DivideIcon as LucideIcon,
  Battery,
  Zap,
  Activity,
  Gauge,
  AudioWaveform,
  Thermometer,
  Clock,
  Percent,
  Power,
  ToggleLeft, // For switch off
  ToggleRight, // For switch on
  AlertTriangle, // For errors/warnings
  Settings, // For configuration parameters
  Sigma, // For totals/sums
  Waves, // For AC related things (alternative to Zap)
  Minimize2, // For Limits Low
  Maximize2, // For Limits High
  FileOutput, // For Export/Output concepts
  Waypoints, // For Grid/Connection concepts
  Info, // For Status/Info
  SigmaSquare, // For Power Factor (cos phi)
  Lightbulb,
  HelpCircle, // For Load
} from 'lucide-react';

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
  icon: typeof LucideIcon; // Icon representation
  unit?: string; // Physical unit (V, A, W, kWh, %, Hz, °C, etc.)
  min?: number; // Minimum value for gauges/validation
  max?: number; // Maximum value for gauges/validation
  description?: string; // Tooltip or extra info
  category: 'battery' | 'grid' | 'inverter' | 'control' | 'three-phase' | 'pv' | 'settings' | 'status' | 'energy'; // Grouping
  factor?: number; // Multiplier for raw value (e.g., 0.1, 0.01, 0.001)
  phase?: 'a' | 'b' | 'c' | 'x'; // Phase identifier ('x' for non-phase specific or total)
  isSinglePhase?: boolean; // Hint for UI rendering
  threePhaseGroup?: string; // Link related phase items (e.g., 'grid-voltage')
  notes?: string; // Internal notes for clarification/TODOs
}

export interface DataPointConfig {
  id: string; // Unique kebab-case identifier from your original DataPoint interface
  label: string; // Make sure this exists or adapt
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
  // ... other types from your DataPoint interface
  | 'DateTime'
  | 'ByteString'
  | 'Guid'
  | 'Byte'
  | 'SByte'
  | 'Int64'
  | 'UInt64';
  uiType: 'display' | 'button' | 'switch' | 'gauge';
  icon: typeof LucideIcon; // Or specific icon type
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
  // Any other fields from your original DataPoint type
}

// ... other interfaces like NodeData, ThreePhaseDisplayGroup if not already defined
export interface ThreePhasePointsConfig {
    a?: DataPointConfig;
    b?: DataPointConfig;
    c?: DataPointConfig;
}

export interface ThreePhaseDisplayGroup {
    groupName: string;
    uiType: 'display' | 'gauge'; // Typically
    points: ThreePhasePointsConfig;
    average?: DataPointConfig; // Optional, if you calculate averages
    total?: DataPointConfig;   // Optional, if you calculate totals
    category: string;
    // An 'id' could be useful here too, e.g., `${groupName}-${uiType}`
    id?: string; 
}

// Helper function for creating IDs
const createId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
};

export const dataPoints: DataPoint[] = [
  // --- Index 0 ---
  {
    id: 'power-on-voltage',
    name: 'Power On Voltage',
    nodeId: 'ns=4;i=3',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Minimum voltage required for inverter power on.',
    category: 'settings',
    factor: 0.1, // Guess: Voltage often scaled by 10
    phase: 'x',
    notes: 'Factor 0.1 assumed for V scaling.',
    label: ''
  },
  // --- Index 1 ---
  {
    id: 'reconnecting-time',
    name: 'Reconnecting Time',
    nodeId: 'ns=4;i=4',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Clock,
    unit: 's',
    description: 'Delay time in seconds before reconnecting after a grid fault.',
    category: 'settings',
    factor: 1, // Assume raw seconds
    phase: 'x',
    label: ''
  },
  // --- Index 2 ---
  {
    id: 'lower-limit-grid-voltage',
    name: 'Lower Limit Grid Voltage',
    nodeId: 'ns=4;i=5',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Minimize2,
    unit: 'V',
    description: 'Lower voltage limit setting for grid connection.',
    category: 'settings',
    factor: 0.1, // Consistent with V scaling
    phase: 'x',
    label: ''
  },
  // --- Index 3 ---
  {
    id: 'upper-limit-grid-voltage-1',
    name: 'Upper Limit Grid Voltage 1',
    nodeId: 'ns=4;i=6',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Maximize2,
    unit: 'V',
    description: 'Upper voltage limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.1, // Consistent with V scaling
    phase: 'x',
    label: ''
  },
  // --- Index 4 ---
  {
    id: 'lower-limit-grid-frequency',
    name: 'Lower Limit Grid Frequency',
    nodeId: 'ns=4;i=7',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Minimize2,
    unit: 'Hz',
    description: 'Lower frequency limit setting for grid connection.',
    category: 'settings',
    factor: 0.01, // Frequency often scaled by 100
    phase: 'x',
    label: ''
  },
  // --- Index 5 ---
  {
    id: 'upper-limit-grid-frequency-1',
    name: 'Upper Limit Grid Frequency 1',
    nodeId: 'ns=4;i=8',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Maximize2,
    unit: 'Hz',
    description: 'Upper frequency limit setting (stage 1) for grid connection.',
    category: 'settings',
    factor: 0.01, // Frequency often scaled by 100
    phase: 'x',
    label: ''
  },
  // --- Index 6 ---
  {
    id: 'device-rtc-year-month',
    name: 'Device RTC Year/Month',
    nodeId: 'ns=4;i=10',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Year and Month (encoded).',
    category: 'status',
    factor: 1, // Raw encoded value
    phase: 'x',
    notes: 'Value likely needs decoding.',
    label: ''
  },
  // --- Index 7 ---
  {
    id: 'device-rtc-day-hour',
    name: 'Device RTC Day/Hour',
    nodeId: 'ns=4;i=11',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Day and Hour (encoded).',
    category: 'status',
    factor: 1, // Raw encoded value
    phase: 'x',
    notes: 'Value likely needs decoding.',
    label: ''
  },
  // --- Index 8 ---
  {
    id: 'device-rtc-minute-second',
    name: 'Device RTC Minute/Second',
    nodeId: 'ns=4;i=12',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Clock,
    description: 'Device internal clock - Minute and Second (encoded).',
    category: 'status',
    factor: 1, // Raw encoded value
    phase: 'x',
    notes: 'Value likely needs decoding.',
    label: ''
  },
  // --- Index 9 ---
  {
    id: 'active-power-adjust',
    name: 'Active Power Adjust',
    nodeId: 'ns=4;i=14',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assuming percentage adjustment
    description: 'Active power output adjustment setting.',
    category: 'control',
    factor: 0.1, // Common scaling for %
    phase: 'x',
    label: ''
  },
  // --- Index 10 ---
  {
    id: 'pf-reactive-power-adjust',
    name: 'PF Reactive Power Adjust',
    nodeId: 'ns=4;i=15',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Settings,
    unit: '', // PF is unitless
    description: 'Power Factor or Reactive Power adjustment setting (PF mode).',
    category: 'control',
    factor: 0.001, // PF often scaled by 1000
    phase: 'x',
    notes: 'Factor 0.001 assumed for PF scaling.',
    label: ''
  },
  // --- Index 11 ---
  {
    id: 'reactive-power-adjust',
    name: 'Reactive Power Adjust',
    nodeId: 'ns=4;i=16',
    dataType: 'Float', // Mapped from Int32
    uiType: 'display',
    icon: Settings,
    unit: 'VAR', // Assuming absolute VAR adjustment
    description: 'Reactive power output adjustment setting (absolute VAR).',
    category: 'control',
    factor: 1, // Assume raw VAR
    phase: 'x',
    label: ''
  },
  // --- Index 12 ---
  {
    id: 'max-value-of-reactive-power',
    name: 'Max Value of Reactive Power',
    nodeId: 'ns=4;i=17',
    dataType: 'Float', // Mapped from UInt32
    uiType: 'display',
    icon: Maximize2,
    unit: 'VAR',
    description: 'Maximum allowed reactive power setting.',
    category: 'settings',
    factor: 1, // Assume raw VAR
    phase: 'x',
    label: ''
  },
  // --- Index 13 ---
  {
    id: 'on-grid-export-power-limit-switch',
    name: 'On Grid Export Power Limit Switch',
    nodeId: 'ns=4;i=19',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: FileOutput, // Icon for export control
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
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Percent,
    unit: '%',
    description: 'Set the export power limit as a percentage of rated power.',
    category: 'control',
    factor: 0.1, // Common scaling for %
    phase: 'x',
    label: ''
  },
  // --- Index 15 ---
  {
    id: 'export-power-percentage-1',
    name: 'Export Power Percentage_1',
    nodeId: 'ns=4;i=21',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Percent,
    unit: '%',
    description: 'Alternative setting for export power limit percentage.',
    category: 'control',
    factor: 0.1, // Common scaling for %
    phase: 'x',
    notes: 'Purpose of _1 unclear, assuming alternative/redundant.',
    label: ''
  },
  // --- Index 16 ---
  {
    id: 'error-message',
    name: 'Error Message',
    nodeId: 'ns=4;i=22',
    dataType: 'Int16', // Mapped from UInt32 (likely a code)
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Error code
    description: 'Current device error code.',
    category: 'status',
    factor: 1, // Raw code
    phase: 'x',
    notes: 'Value likely needs lookup table for description.',
    label: ''
  },
  // --- Index 17 ---
  {
    id: 'high-byte-total-power-generation',
    name: 'High Byte Total Power Generation',
    nodeId: 'ns=4;i=24',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of a larger value
    description: 'High byte of the total generated power.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with low byte (i=25) for full value. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 18 ---
  {
    id: 'low-byte-total-power-generation',
    name: 'Low Byte Total Power Generation',
    nodeId: 'ns=4;i=25',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of a larger value
    description: 'Low byte of the total generated power.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with high byte (i=24) for full value. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 19 ---
  {
    id: 'high-byte-hourly-power-generation',
    name: 'High Byte Hourly Power Generation',
    nodeId: 'ns=4;i=26',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap,
    unit: '', // Part of a larger value
    description: 'High byte of the power generated in the current hour.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with low byte (i=27) for full value. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 20 ---
  {
    id: 'low-byte-hourly-power-generation',
    name: 'Low Byte Hourly Power Generation',
    nodeId: 'ns=4;i=27',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap,
    unit: '', // Part of a larger value
    description: 'Low byte of the power generated in the current hour.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with high byte (i=26) for full value. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 21 ---
  {
    id: 'vpv1',
    name: 'PV1 Input Voltage',
    nodeId: 'ns=4;i=28',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap, // Consider a dedicated Solar icon
    unit: 'V',
    description: 'Input voltage from PV string 1.',
    category: 'pv',
    factor: 0.1, // Common PV scaling
    phase: 'x',
    label: ''
  },
  // --- Index 22 ---
  {
    id: 'vpv2',
    name: 'PV2 Input Voltage',
    nodeId: 'ns=4;i=29',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap, // Consider a dedicated Solar icon
    unit: 'V',
    description: 'Input voltage from PV string 2.',
    category: 'pv',
    factor: 0.1, // Common PV scaling
    phase: 'x',
    label: ''
  },
  // --- Index 23 ---
  {
    id: 'ipv1',
    name: 'PV1 Input Current',
    nodeId: 'ns=4;i=30',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap, // Consider a dedicated Solar icon
    unit: 'A',
    description: 'Input current from PV string 1.',
    category: 'pv',
    factor: 0.1, // Common PV scaling
    phase: 'x',
    label: ''
  },
  // --- Index 24 ---
  {
    id: 'ipv2',
    name: 'PV2 Input Current',
    nodeId: 'ns=4;i=31',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Zap, // Consider a dedicated Solar icon
    unit: 'A',
    description: 'Input current from PV string 2.',
    category: 'pv',
    factor: 0.1, // Common PV scaling
    phase: 'x',
    label: ''
  },
  // --- Index 25 ---
  {
    id: 'vac1',
    name: 'L1 Phase Voltage',
    nodeId: 'ns=4;i=32',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L1.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: ''
  },
  // --- Index 26 ---
  {
    id: 'vac2',
    name: 'L2 Phase Voltage',
    nodeId: 'ns=4;i=33',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L2.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: ''
  },
  // --- Index 27 ---
  {
    id: 'vac3',
    name: 'L3 Phase Voltage',
    nodeId: 'ns=4;i=34',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L3.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-raw',
    label: ''
  },
  // --- Index 28 ---
  {
    id: 'iac1',
    name: 'L1 Phase Current',
    nodeId: 'ns=4;i=35',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L1.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: ''
  },
  // --- Index 29 ---
  {
    id: 'iac2',
    name: 'L2 Phase Current',
    nodeId: 'ns=4;i=36',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L2.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: ''
  },
  // --- Index 30 ---
  {
    id: 'iac3',
    name: 'L3 Phase Current',
    nodeId: 'ns=4;i=37',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L3.',
    category: 'three-phase',
    factor: 0.1, // Common AC scaling
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-raw',
    label: ''
  },
  // --- Index 31 ---
  {
    id: 'fac1',
    name: 'L1 Phase Frequency',
    nodeId: 'ns=4;i=38',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AudioWaveform,
    unit: 'Hz',
    description: 'Grid frequency measured on phase L1.',
    category: 'three-phase',
    factor: 0.01, // Common frequency scaling
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: ''
  },
  // --- Index 32 ---
  {
    id: 'fac2',
    name: 'L2 Phase Frequency',
    nodeId: 'ns=4;i=39',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AudioWaveform,
    unit: 'Hz',
    description: 'Grid frequency measured on phase L2.',
    category: 'three-phase',
    factor: 0.01, // Common frequency scaling
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: ''
  },
  // --- Index 33 ---
  {
    id: 'fac3',
    name: 'L3 Phase Frequency',
    nodeId: 'ns=4;i=40',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AudioWaveform,
    unit: 'Hz',
    description: 'Grid frequency measured on phase L3.',
    category: 'three-phase',
    factor: 0.01, // Common frequency scaling
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-frequency-raw',
    label: ''
  },
  // --- Index 34 ---
  {
    id: 'pac-l-inverter-power', // Assuming Pac means Power, not Current
    name: 'Inverter Active Power Output (Pac)',
    nodeId: 'ns=4;i=41',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total active power output from the inverter.',
    category: 'inverter',
    factor: 1, // Assume raw Watts, check value range
    phase: 'x',
    notes: 'Name ambiguous (Pac L / inverter current). Assumed Power.',
    label: ''
  },
  // --- Index 35 ---
  {
    id: 'work-mode-status',
    name: 'Work Mode Status',
    nodeId: 'ns=4;i=42',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Info,
    unit: '', // Mode code
    description: 'Current inverter work mode status code.',
    category: 'status',
    factor: 1, // Raw code
    phase: 'x',
    notes: 'Value likely needs lookup table for description.',
    label: ''
  },
  // --- Index 36 ---
  {
    id: 'inverter-internal-temperature', // Guess based on common parameters
    name: 'Inverter Internal Temperature',
    nodeId: 'ns=4;i=43',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature measured inside the inverter.',
    category: 'inverter',
    factor: 0.1, // Common temp scaling
    phase: 'x',
    notes: 'Name "Inverter internal" is vague, assumed temperature.',
    label: ''
  },
  // --- Index 37 ---
  {
    id: 'e-day-daily-power-generation',
    name: 'Daily Power Generation (E-day)',
    nodeId: 'ns=4;i=44',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Sigma,
    unit: 'kWh',
    description: 'Total energy generated by the inverter today.',
    category: 'energy',
    factor: 0.1, // Assuming raw value is Wh*10
    phase: 'x',
    notes: 'Factor 0.1 assumes raw value is 0.1 kWh units.',
    label: ''
  },
  // --- Index 38 ---
  {
    id: 'grid1-i-precise',
    name: 'Grid Current L1 (Precise)',
    nodeId: 'ns=4;i=46',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L1 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-precise',
    label: ''
  },
  // --- Index 39 ---
  {
    id: 'grid2-i-precise',
    name: 'Grid Current L2 (Precise)',
    nodeId: 'ns=4;i=47',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L2 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-precise',
    label: ''
  },
  // --- Index 40 ---
  {
    id: 'grid3-i-precise',
    name: 'Grid Current L3 (Precise)',
    nodeId: 'ns=4;i=48',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Grid current of phase L3 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-current-precise',
    label: ''
  },
  // --- Index 41 ---
  {
    id: 'grid-v-l1-precise',
    name: 'Grid Voltage L1 (Precise)',
    nodeId: 'ns=4;i=49',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L1 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify if raw value matches expected range.',
    label: ''
  },
  // --- Index 42 ---
  {
    id: 'grid-v-l2-precise',
    name: 'Grid Voltage L2 (Precise)',
    nodeId: 'ns=4;i=50',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L2 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify if raw value matches expected range.',
    label: ''
  },
  // --- Index 43 ---
  {
    id: 'grid-v-l3-precise',
    name: 'Grid Voltage L3 (Precise)',
    nodeId: 'ns=4;i=51',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Grid voltage of phase L3 (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify if raw value matches expected range.',
    label: ''
  },
  // --- Index 44 ---
  {
    id: 'limit1-i-precise',
    name: 'Limit Current L1 (Precise)',
    nodeId: 'ns=4;i=52',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'A',
    description: 'Limit current setting/measurement for phase L1 (high precision).',
    category: 'settings', // Assuming it's related to a limit setting
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'limit-current-precise',
    label: ''
  },
  // --- Index 45 ---
  {
    id: 'limit2-i-precise',
    name: 'Limit Current L2 (Precise)',
    nodeId: 'ns=4;i=53',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'A',
    description: 'Limit current setting/measurement for phase L2 (high precision).',
    category: 'settings',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'limit-current-precise',
    label: ''
  },
  // --- Index 46 ---
  {
    id: 'limit3-i-precise',
    name: 'Limit Current L3 (Precise)',
    nodeId: 'ns=4;i=54',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'A',
    description: 'Limit current setting/measurement for phase L3 (high precision).',
    category: 'settings',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'limit-current-precise',
    label: ''
  },
  // --- Index 47 ---
  {
    id: 'pv1-v-precise',
    name: 'PV1 Voltage (Precise)',
    nodeId: 'ns=4;i=55',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 1 (high precision).',
    category: 'pv',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'x',
    notes: 'Factor 0.001 for PV Voltage seems unusual. Verify.',
    label: ''
  },
  // --- Index 48 ---
  {
    id: 'pv1-i-precise',
    name: 'PV1 Current (Precise)',
    nodeId: 'ns=4;i=56',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 1 (high precision).',
    category: 'pv',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'x',
    label: ''
  },
  // --- Index 49 ---
  {
    id: 'pv2-v-precise',
    name: 'PV2 Voltage (Precise)',
    nodeId: 'ns=4;i=57',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 2 (high precision).',
    category: 'pv',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'x',
    notes: 'Factor 0.001 for PV Voltage seems unusual. Verify.',
    label: ''
  },
  // --- Index 50 ---
  {
    id: 'pv2-i-precise',
    name: 'PV2 Current (Precise)',
    nodeId: 'ns=4;i=58',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 2 (high precision).',
    category: 'pv',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'x',
    label: ''
  },
  // --- Index 51 ---
  {
    id: 'inv-a-i-precise',
    name: 'Inverter Current A (Precise)',
    nodeId: 'ns=4;i=59',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Inverter output current phase A (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-current-precise',
    label: ''
  },
  // --- Index 52 ---
  {
    id: 'inv-b-i-precise',
    name: 'Inverter Current B (Precise)',
    nodeId: 'ns=4;i=60',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Inverter output current phase B (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-current-precise',
    label: ''
  },
  // --- Index 53 ---
  {
    id: 'inv-c-i-precise',
    name: 'Inverter Current C (Precise)',
    nodeId: 'ns=4;i=61',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Inverter output current phase C (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-current-precise',
    label: ''
  },
  // --- Index 54 ---
  {
    id: 'inv-a-v-precise',
    name: 'Inverter Voltage A (Precise)',
    nodeId: 'ns=4;i=62',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Inverter output voltage phase A (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify.',
    label: ''
  },
  // --- Index 55 ---
  {
    id: 'inv-b-v-precise',
    name: 'Inverter Voltage B (Precise)',
    nodeId: 'ns=4;i=63',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Inverter output voltage phase B (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify.',
    label: ''
  },
  // --- Index 56 ---
  {
    id: 'inv-c-v-precise',
    name: 'Inverter Voltage C (Precise)',
    nodeId: 'ns=4;i=64',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Inverter output voltage phase C (high precision).',
    category: 'three-phase',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-voltage-precise',
    notes: 'Factor 0.001 for Voltage seems unusual. Verify.',
    label: ''
  },
  // --- Index 57 ---
  {
    id: 'bat-i-precise',
    name: 'Battery Current (Precise)',
    nodeId: 'ns=4;i=65',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery,
    unit: 'A',
    description: 'Battery current (high precision). Positive=charging, Negative=discharging.',
    category: 'battery',
    factor: 0.001, // Divisor 1000 noted in log
    phase: 'x',
    label: ''
  },
  // --- Index 58 ---
  {
    id: 'bat-v-precise',
    name: 'Battery Voltage (Precise)',
    nodeId: 'ns=4;i=66',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery,
    unit: 'V',
    description: 'Battery voltage (high precision).',
    category: 'battery',
    factor: 0.001, // Divisor 1000 noted in log (Unusual for V, check value)
    phase: 'x',
    notes: 'Factor 0.001 for Battery Voltage seems unusual (e.g. 50V -> 50000). Verify.',
    label: ''
  },
  // --- Index 59 ---
  {
    id: 'max-solar-sell-power-setting', // Assuming this is a setting
    name: 'Max Solar Sell Power Setting',
    nodeId: 'ns=4;i=68',
    dataType: 'Int16', // Corrected from Boolean based on name/value
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assuming Watts based on value 12000
    description: 'Setting for the maximum power allowed to be sold to the grid from solar.',
    category: 'control',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Log shows Boolean, but name/value suggest Int16 power setting.',
    label: ''
  },
  // --- Index 60 ---
  {
    id: 'run-state',
    name: 'Run State',
    nodeId: 'ns=4;i=70',
    dataType: 'Int16',
    uiType: 'display',
    icon: Info,
    unit: '', // State code
    description: 'Current operational state code of the inverter.',
    category: 'status',
    factor: 1, // Raw code
    phase: 'x',
    notes: 'Value likely needs lookup table for description.',
    label: ''
  },
  // --- Index 61 ---
  {
    id: 'active-power-generation-today',
    name: 'Active Power Generation Today',
    nodeId: 'ns=4;i=71',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'kWh', // Assuming kWh for daily energy
    description: 'Total active energy generated today.',
    category: 'energy',
    factor: 0.1, // Assuming raw value is Wh*10
    phase: 'x',
    notes: 'Factor 0.1 assumes raw value is 0.1 kWh units.',
    label: ''
  },
  // --- Index 62 ---
  {
    id: 'reactive-power-generation-today',
    name: 'Reactive Power Generation Today',
    nodeId: 'ns=4;i=72',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'kVARh', // Assuming kVARh for daily energy
    description: 'Total reactive energy generated today.',
    category: 'energy',
    factor: 0.1, // Assuming similar scaling as active power
    phase: 'x',
    notes: 'Factor 0.1 assumes raw value is 0.1 kVARh units.',
    label: ''
  },
  // --- Index 63 ---
  {
    id: 'grid-connection-time-today',
    name: 'Grid Connection Time Today',
    nodeId: 'ns=4;i=73',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: Clock,
    unit: 'min', // Assuming minutes
    description: 'Total time the inverter has been connected to the grid today.',
    category: 'status',
    factor: 1, // Assume raw minutes
    phase: 'x',
    label: ''
  },
  // --- Index 64 ---
  {
    id: 'active-power-gen-total-low-byte',
    name: 'Active Power Generation Total (Low)',
    nodeId: 'ns=4;i=74',
    dataType: 'Int16', // Mapped from WORD
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total active power generation lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=75). Unit/Factor TBD.',
    label: ''
  },
  // --- Index 65 ---
  {
    id: 'active-power-gen-total-high-byte',
    name: 'Active Power Generation Total (High)',
    nodeId: 'ns=4;i=75',
    dataType: 'Int16', // Mapped from WORD
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total active power generation lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=74). Unit/Factor TBD.',
    label: ''
  },
  // --- Index 66 ---
  {
    id: 'active-power-gen-total-low-byte-1',
    name: 'Active Power Generation Total (Low)_1',
    nodeId: 'ns=4;i=76',
    dataType: 'Int16', // Mapped from WORD
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the alternative total active power generation counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=77). Purpose of _1 unclear. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 67 ---
  {
    id: 'active-power-gen-total-high-byte-1',
    name: 'Active Power Generation Total (High)_1',
    nodeId: 'ns=4;i=77',
    dataType: 'Int16', // Mapped from WORD
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the alternative total active power generation counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=76). Purpose of _1 unclear. Unit/Factor TBD.',
    label: ''
  },
  // --- Index 68 ---
  {
    id: 'day-battery-charge-energy', // Assuming this is daily energy based on value 3
    name: 'Day Battery Charge Energy',
    nodeId: 'ns=4;i=79',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery,
    unit: 'Wh', // Guessing Wh based on other daily values
    description: 'Total energy charged into the battery today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Name "Total charge" vs value 3 is confusing. Assumed Daily Wh.',
    label: ''
  },
  // --- Index 69 ---
  {
    id: 'total-charge-battery-low-byte',
    name: 'Total Battery Charge (Low)',
    nodeId: 'ns=4;i=80',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total battery charge lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=81). Unit (Ah? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 70 ---
  {
    id: 'total-charge-battery-high-byte',
    name: 'Total Battery Charge (High)',
    nodeId: 'ns=4;i=81',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total battery charge lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=80). Unit (Ah? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 71 ---
  {
    id: 'total-discharge-battery-low-byte',
    name: 'Total Battery Discharge (Low)',
    nodeId: 'ns=4;i=82',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total battery discharge lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=83). Unit (Ah? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 72 ---
  {
    id: 'total-discharge-battery-high-byte',
    name: 'Total Battery Discharge (High)',
    nodeId: 'ns=4;i=83',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total battery discharge lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=82). Unit (Ah? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 73 ---
  {
    id: 'day-grid-buy-power-wh',
    name: 'Day Grid Buy Power (Wh)',
    nodeId: 'ns=4;i=84',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy bought from the grid today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 74 ---
  {
    id: 'day-grid-sell-power-wh',
    name: 'Day Grid Sell Power (Wh)',
    nodeId: 'ns=4;i=85',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy sold to the grid today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 75 ---
  {
    id: 'total-grid-buy-power-wh-low-word',
    name: 'Total Grid Buy Power (Low)',
    nodeId: 'ns=4;i=86',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total grid buy energy lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=87). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 76 ---
  {
    id: 'total-grid-buy-power-wh-high-word',
    name: 'Total Grid Buy Power (High)',
    nodeId: 'ns=4;i=87',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total grid buy energy lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=86). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 77 ---
  {
    id: 'total-grid-sell-power-wh-low-word',
    name: 'Total Grid Sell Power (Low)',
    nodeId: 'ns=4;i=88',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total grid sell energy lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=89). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 78 ---
  {
    id: 'total-grid-sell-power-wh-high-word',
    name: 'Total Grid Sell Power (High)',
    nodeId: 'ns=4;i=89',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total grid sell energy lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=88). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 79 ---
  {
    id: 'day-load-power-wh',
    name: 'Day Load Power (Wh)',
    nodeId: 'ns=4;i=90',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy consumed by the load today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 80 ---
  {
    id: 'total-load-power-wh-low-word',
    name: 'Total Load Power (Low)',
    nodeId: 'ns=4;i=91',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total load energy consumption lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=92). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 81 ---
  {
    id: 'total-load-power-wh-high-word',
    name: 'Total Load Power (High)',
    nodeId: 'ns=4;i=92',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total load energy consumption lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=91). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 82 ---
  {
    id: 'day-pv-power-wh',
    name: 'Day PV Power (Wh)',
    nodeId: 'ns=4;i=93',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy generated from all PV inputs today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 83 ---
  {
    id: 'day-pv1-power-wh',
    name: 'Day PV1 Power (Wh)',
    nodeId: 'ns=4;i=94',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy generated from PV input 1 today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 84 ---
  {
    id: 'day-pv2-power-wh',
    name: 'Day PV2 Power (Wh)',
    nodeId: 'ns=4;i=95',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy generated from PV input 2 today.',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 85 ---
  {
    id: 'day-pv3-power-wh',
    name: 'Day PV3 Power (Wh)',
    nodeId: 'ns=4;i=96',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy generated from PV input 3 today (if applicable).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 86 ---
  {
    id: 'day-pv4-power-wh',
    name: 'Day PV4 Power (Wh)',
    nodeId: 'ns=4;i=97',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh',
    description: 'Total energy generated from PV input 4 today (if applicable).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    label: ''
  },
  // --- Index 87 ---
  {
    id: 'total-pv-power-wh-low-word',
    name: 'Total PV Power (Low)',
    nodeId: 'ns=4;i=98',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'Low word of the total PV energy generation lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with High word (i=99). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 88 ---
  {
    id: 'total-pv-power-wh-high-word',
    name: 'Total PV Power (High)',
    nodeId: 'ns=4;i=99',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma,
    unit: '', // Part of 32-bit value
    description: 'High word of the total PV energy generation lifetime counter.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Combine with Low word (i=98). Unit (Wh? kWh?) and Factor TBD.',
    label: ''
  },
  // --- Index 89 ---
  {
    id: 'dc-transformer-temperature',
    name: 'DC Transformer Temperature',
    nodeId: 'ns=4;i=101',
    dataType: 'Int16',
    uiType: 'display',
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature of the DC transformer component.',
    category: 'inverter',
    factor: 0.1, // Common temp scaling
    phase: 'x',
    label: ''
  },
  // --- Index 90 ---
  {
    id: 'heat-sink-temperature',
    name: 'Heat Sink Temperature',
    nodeId: 'ns=4;i=102',
    dataType: 'Int16',
    uiType: 'display',
    icon: Thermometer,
    unit: '°C',
    description: 'Temperature of the inverter heat sink.',
    category: 'inverter',
    factor: 0.1, // Common temp scaling
    phase: 'x',
    label: ''
  },
  // --- Index 91 ---
  {
    id: 'on-off-status',
    name: 'On/Off Status',
    nodeId: 'ns=4;i=104',
    dataType: 'Boolean',
    uiType: 'display', // Displaying status, not controlling
    icon: Power, // Power symbol for on/off
    description: 'Indicates if the inverter is currently On (True) or Off (False).',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 92 ---
  {
    id: 'ac-relay-status',
    name: 'AC Relay Status',
    nodeId: 'ns=4;i=105',
    dataType: 'Int16', // Likely a bitmask or enum
    uiType: 'display',
    icon: Waypoints, // Relay connects paths
    unit: '', // Status code
    description: 'Status code representing the state of the AC relay(s).',
    category: 'status',
    factor: 1, // Raw code
    phase: 'x',
    notes: 'Value needs decoding (bitmask or enum).',
    label: ''
  },
  // --- Index 93 ---
  {
    id: 'warning-message-word-1',
    name: 'Warning Message Word 1',
    nodeId: 'ns=4;i=106',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Warning code/bits
    description: 'Warning status flags (Word 1).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 94 ---
  {
    id: 'warning-message-word-2',
    name: 'Warning Message Word 2',
    nodeId: 'ns=4;i=107',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Warning code/bits
    description: 'Warning status flags (Word 2).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 95 ---
  {
    id: 'fault-information-word-1',
    name: 'Fault Information Word 1',
    nodeId: 'ns=4;i=108',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle, // Use stronger alert for fault
    unit: '', // Fault code/bits
    description: 'Fault status flags (Word 1).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 96 ---
  {
    id: 'fault-information-word-2',
    name: 'Fault Information Word 2',
    nodeId: 'ns=4;i=109',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Fault code/bits
    description: 'Fault status flags (Word 2).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 97 ---
  {
    id: 'fault-information-word-3',
    name: 'Fault Information Word 3',
    nodeId: 'ns=4;i=110',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Fault code/bits
    description: 'Fault status flags (Word 3).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 98 ---
  {
    id: 'fault-information-word-4',
    name: 'Fault Information Word 4',
    nodeId: 'ns=4;i=111',
    dataType: 'Int16', // Mapped from UInt16
    uiType: 'display',
    icon: AlertTriangle,
    unit: '', // Fault code/bits
    description: 'Fault status flags (Word 4).',
    category: 'status',
    factor: 1, // Raw bits
    phase: 'x',
    notes: 'Value is likely a bitmask. Needs decoding.',
    label: ''
  },
  // --- Index 99 ---
  {
    id: 'battery-temperature',
    name: 'Battery Temperature',
    nodeId: 'ns=4;i=113',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Thermometer, // Changed from Gauge to Thermometer
    unit: '°C',
    min: -10, // Example range
    max: 60, // Example range
    description: 'Temperature of the battery.',
    category: 'battery',
    factor: (1 / 4095) * 100, // 1280 -> 128.0C still seems high, but using scaling
    phase: 'x',
    notes: 'Factor F to  C  yields high temp (128C from log). Verify scaling.',
    label: ''
  },
  // --- Index 100 ---
  {
    id: 'battery-voltage',
    name: 'Battery Voltage',
    nodeId: 'ns=4;i=114',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery,
    unit: 'V',
    min: 40, // Example range for LiFePO4
    max: 58, // Example range for LiFePO4
    description: 'Current battery voltage.',
    category: 'battery',
    factor: 0.01, // 5163 -> 51.63V (Confirmed plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 101 ---
  {
    id: 'battery-capacity',
    name: 'Battery Capacity (SoC)',
    nodeId: 'ns=4;i=115',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: Battery, // Consider BatteryCharging icon based on current?
    unit: '%',
    min: 0,
    max: 100,
    description: 'Current battery State of Charge (SoC).',
    category: 'battery',
    factor: 1, // 100 -> 100% (Confirmed plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 102 ---
  {
    id: 'not-applicable-116',
    name: 'N/A (i=116)',
    nodeId: 'ns=4;i=116',
    dataType: 'Int16',
    uiType: 'display',
    icon: HelpCircle, // Default/Unknown Icon
    description: 'Unidentified data point at ns=4;i=116.',
    category: 'status', // Default category
    factor: 1,
    phase: 'x',
    notes: 'Marked N/A in log. Identify purpose or remove.',
    label: ''
  },
  // --- Index 103 ---
  {
    id: 'battery-output-power',
    name: 'Battery Output Power',
    nodeId: 'ns=4;i=117',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Current power flow from the battery. Positive=discharging, Negative=charging.',
    category: 'battery',
    factor: 1, // -7 -> -7W (Plausible low power flow)
    phase: 'x',
    label: ''
  },
  // --- Index 104 ---
  {
    id: 'battery-output-current',
    name: 'Battery Output Current',
    nodeId: 'ns=4;i=118',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery, // Current directly related to battery
    unit: 'A',
    description: 'Current flow from the battery. Positive=discharging, Negative=charging.',
    category: 'battery',
    factor: 0.1, // -15 -> -1.5A (Seems plausible scaling)
    phase: 'x',
    label: ''
  },
  // --- Index 105 ---
  {
    id: 'corrected-ah',
    name: 'Corrected AH',
    nodeId: 'ns=4;i=119',
    dataType: 'Int16',
    uiType: 'display',
    icon: Sigma, // Represents a calculated/total value
    unit: 'Ah',
    description: 'Corrected Ampere-hour capacity or counter.',
    category: 'battery',
    factor: 0.1, // 712 -> 71.2 Ah (Plausible magnitude for capacity)
    phase: 'x',
    label: ''
  },
  // --- Index 106 ---
  {
    id: 'grid-voltage-a',
    name: 'Grid Voltage Phase A',
    nodeId: 'ns=4;i=121',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    min: 200, // Example lower bound
    max: 260, // Example upper bound
    description: 'Grid Phase A voltage measurement.',
    category: 'three-phase',
    factor: 0.1, // 2360 -> 236.0V (Confirmed plausible)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage',
    label: ''
  },
  // --- Index 107 ---
  {
    id: 'grid-voltage-b',
    name: 'Grid Voltage Phase B',
    nodeId: 'ns=4;i=122',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    min: 200,
    max: 260,
    description: 'Grid Phase B voltage measurement.',
    category: 'three-phase',
    factor: 0.1, // 2442 -> 244.2V (Confirmed plausible)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage',
    label: ''
  },
  // --- Index 108 ---
  {
    id: 'grid-voltage-c',
    name: 'Grid Voltage Phase C',
    nodeId: 'ns=4;i=123',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    min: 200,
    max: 260,
    description: 'Grid Phase C voltage measurement.',
    category: 'three-phase',
    factor: 0.1, // 2431 -> 243.1V (Confirmed plausible)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-voltage',
    label: ''
  },
  // --- Index 109 ---
  {
    id: 'grid-line-voltage-ab',
    name: 'Grid Line Voltage AB',
    nodeId: 'ns=4;i=124',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Line-to-line voltage between grid phases A and B.',
    category: 'three-phase',
    factor: 0.1, // Consistent V scaling
    phase: 'x', // Represents L-L
    isSinglePhase: false,
    threePhaseGroup: 'grid-line-voltage',
    label: ''
  },
  // --- Index 110 ---
  {
    id: 'grid-line-voltage-bc',
    name: 'Grid Line Voltage BC',
    nodeId: 'ns=4;i=125',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Line-to-line voltage between grid phases B and C.',
    category: 'three-phase',
    factor: 0.1, // Consistent V scaling
    phase: 'x', // Represents L-L
    isSinglePhase: false,
    threePhaseGroup: 'grid-line-voltage',
    label: ''
  },
  // --- Index 111 ---
  {
    id: 'grid-line-voltage-ca',
    name: 'Grid Line Voltage CA',
    nodeId: 'ns=4;i=126',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Line-to-line voltage between grid phases C and A.',
    category: 'three-phase',
    factor: 0.1, // Consistent V scaling
    phase: 'x', // Represents L-L
    isSinglePhase: false,
    threePhaseGroup: 'grid-line-voltage',
    label: ''
  },
  // --- Index 112 ---
  {
    id: 'grid-inner-power-a',
    name: 'Grid Inner Power A',
    nodeId: 'ns=4;i=127',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured at the inner side of the grid connection, Phase A.',
    category: 'three-phase',
    factor: 1, // -328 -> -328W (Plausible raw value)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-inner-power',
    label: ''
  },
  // --- Index 113 ---
  {
    id: 'grid-inner-power-b',
    name: 'Grid Inner Power B',
    nodeId: 'ns=4;i=128',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured at the inner side of the grid connection, Phase B.',
    category: 'three-phase',
    factor: 1, // -1549 -> -1549W (Plausible raw value)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-inner-power',
    label: ''
  },
  // --- Index 114 ---
  {
    id: 'grid-inner-power-c',
    name: 'Grid Inner Power C',
    nodeId: 'ns=4;i=129',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured at the inner side of the grid connection, Phase C.',
    category: 'three-phase',
    factor: 1, // -199 -> -199W (Plausible raw value)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-inner-power',
    label: ''
  },
  // --- Index 115 ---
  {
    id: 'grid-total-active-power-side-to-side',
    name: 'Total Active Power (Grid Side-to-Side)',
    nodeId: 'ns=4;i=130',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total active power flow measured from side to side of the grid connection.',
    category: 'grid',
    factor: 1, // -2076 -> -2076W (Sum matches phases, plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 116 ---
  {
    id: 'grid-side-inner-total-apparent-power',
    name: 'Grid Side Inner Total Apparent Power',
    nodeId: 'ns=4;i=131',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power, // Could use a specific VA icon if available
    unit: 'VA',
    description: 'Total apparent power measured at the inner side of the grid connection.',
    category: 'grid',
    factor: 1, // Assume raw VA
    phase: 'x',
    label: ''
  },
  // --- Index 117 ---
  {
    id: 'grid-side-frequency',
    name: 'Grid Side Frequency',
    nodeId: 'ns=4;i=132',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: AudioWaveform,
    unit: 'Hz',
    min: 49.5, // Slightly wider range
    max: 50.5,
    description: 'Frequency measured at the grid side connection.',
    category: 'grid',
    factor: 0.01, // 5008 -> 50.08 Hz (Confirmed plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 118 ---
  {
    id: 'grid-side-inner-current-a',
    name: 'Grid Side Inner Current A',
    nodeId: 'ns=4;i=133',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured at the inner side of the grid connection, Phase A.',
    category: 'three-phase',
    factor: 0.01, // 176 -> 1.76A (More plausible than 0.1 or 0.001)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-inner-current',
    label: ''
  },
  // --- Index 119 ---
  {
    id: 'grid-side-inner-current-b',
    name: 'Grid Side Inner Current B',
    nodeId: 'ns=4;i=134',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured at the inner side of the grid connection, Phase B.',
    category: 'three-phase',
    factor: 0.01, // 636 -> 6.36A (Consistent)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-inner-current',
    label: ''
  },
  // --- Index 120 ---
  {
    id: 'grid-side-inner-current-c',
    name: 'Grid Side Inner Current C',
    nodeId: 'ns=4;i=135',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured at the inner side of the grid connection, Phase C.',
    category: 'three-phase',
    factor: 0.01, // 105 -> 1.05A (Consistent)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-inner-current',
    label: ''
  },
  // --- Index 121 ---
  {
    id: 'out-of-grid-current-a',
    name: 'Out-of-Grid Current A',
    nodeId: 'ns=4;i=136',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured on the load/backup side (off-grid capable), Phase A.',
    category: 'three-phase',
    factor: 0.01, // Consistent scaling
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-current',
    label: ''
  },
  // --- Index 122 ---
  {
    id: 'out-of-grid-current-b',
    name: 'Out-of-Grid Current B',
    nodeId: 'ns=4;i=137',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured on the load/backup side (off-grid capable), Phase B.',
    category: 'three-phase',
    factor: 0.01, // Consistent scaling (641 -> 6.41A)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-current',
    label: ''
  },
  // --- Index 123 ---
  {
    id: 'out-of-grid-current-c',
    name: 'Out-of-Grid Current C',
    nodeId: 'ns=4;i=138',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Current measured on the load/backup side (off-grid capable), Phase C.',
    category: 'three-phase',
    factor: 0.01, // Consistent scaling (104 -> 1.04A)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-current',
    label: ''
  },
  // --- Index 124 ---
  {
    id: 'out-of-grid-power-a',
    name: 'Out-of-Grid Power A',
    nodeId: 'ns=4;i=139',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the load/backup side (off-grid capable), Phase A.',
    category: 'three-phase',
    factor: 1, // 348 -> 348W (Plausible raw)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-power',
    label: ''
  },
  // --- Index 125 ---
  {
    id: 'out-of-grid-power-b',
    name: 'Out-of-Grid Power B',
    nodeId: 'ns=4;i=140',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the load/backup side (off-grid capable), Phase B.',
    category: 'three-phase',
    factor: 1, // 1556 -> 1556W (Plausible raw)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-power',
    label: ''
  },
  // --- Index 126 ---
  {
    id: 'out-of-grid-power-c',
    name: 'Out-of-Grid Power C',
    nodeId: 'ns=4;i=141',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the load/backup side (off-grid capable), Phase C.',
    category: 'three-phase',
    factor: 1, // 182 -> 182W (Plausible raw)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'out-of-grid-power',
    label: ''
  },
  // --- Index 127 ---
  {
    id: 'out-of-grid-total-power',
    name: 'Out-of-Grid Total Power (Export)',
    nodeId: 'ns=4;i=142',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total power measured on the load/backup side (off-grid capable).',
    category: 'inverter', // Represents inverter output in this mode
    factor: 1, // 2086 -> 2086W (Sum matches phases, plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 128 ---
  {
    id: 'out-of-grid-total-apparent-power',
    name: 'Out-of-Grid Total Apparent Power',
    nodeId: 'ns=4;i=143',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'VA',
    description: 'Total apparent power measured on the load/backup side (off-grid capable).',
    category: 'inverter',
    factor: 1, // Assume raw VA
    phase: 'x',
    label: ''
  },
  // --- Index 129 ---
  {
    id: 'grid-connected-power-factor',
    name: 'Grid Connected Power Factor',
    nodeId: 'ns=4;i=144',
    dataType: 'Int16',
    uiType: 'display',
    icon: SigmaSquare, // Icon for PF
    unit: '', // PF is unitless
    description: 'Overall power factor when connected to the grid.',
    category: 'grid',
    factor: 0.01, // Assume scaling * 100 (0 -> 0.00)
    phase: 'x',
    label: ''
  },
  // --- Index 130 ---
  {
    id: 'grid-side-a-phase-power',
    name: 'Grid Side A Phase Power',
    nodeId: 'ns=4;i=145',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the grid side, Phase A. (Potentially redundant with i=127)',
    category: 'three-phase',
    factor: 1, // -328 -> -328W
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-power',
    notes: 'Seems redundant with grid-inner-power-a (i=127). Verify difference.',
    label: ''
  },
  // --- Index 131 ---
  {
    id: 'grid-side-b-phase-power',
    name: 'Grid Side B Phase Power',
    nodeId: 'ns=4;i=146',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the grid side, Phase B. (Potentially redundant with i=128)',
    category: 'three-phase',
    factor: 1, // -1549 -> -1549W
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-power',
    notes: 'Seems redundant with grid-inner-power-b (i=128). Verify difference.',
    label: ''
  },
  // --- Index 132 ---
  {
    id: 'grid-side-c-phase-power',
    name: 'Grid Side C Phase Power',
    nodeId: 'ns=4;i=147',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power measured on the grid side, Phase C. (Potentially redundant with i=129)',
    category: 'three-phase',
    factor: 1, // -199 -> -199W
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'grid-side-power',
    notes: 'Seems redundant with grid-inner-power-c (i=129). Verify difference.',
    label: ''
  },
  // --- Index 133 ---
  {
    id: 'grid-side-total-power', // Corrected typo "Drid"
    name: 'Grid Side Total Power',
    nodeId: 'ns=4;i=148',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total power measured on the grid side. (Potentially redundant with i=130)',
    category: 'grid',
    factor: 1, // -2076 -> -2076W
    phase: 'x',
    notes: 'Seems redundant with grid-total-active-power-side-to-side (i=130). Verify difference.',
    label: ''
  },
  // --- Index 134 ---
  {
    id: 'not-applicable-149',
    name: 'N/A (i=149)',
    nodeId: 'ns=4;i=149',
    dataType: 'Int16',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unidentified data point at ns=4;i=149.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked N/A in log. Identify purpose or remove.',
    label: ''
  },
  // --- Index 135 ---
  {
    id: 'inverter-output-phase-voltage-a',
    name: 'Inverter Output Phase Voltage A',
    nodeId: 'ns=4;i=150',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Output voltage from the inverter, Phase A.',
    category: 'three-phase',
    factor: 0.1, // 2365 -> 236.5V (Plausible)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-voltage',
    label: ''
  },
  // --- Index 136 ---
  {
    id: 'inverter-output-phase-voltage-b',
    name: 'Inverter Output Phase Voltage B',
    nodeId: 'ns=4;i=151',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Output voltage from the inverter, Phase B.',
    category: 'three-phase',
    factor: 0.1, // 2444 -> 244.4V (Plausible)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-voltage',
    label: ''
  },
  // --- Index 137 ---
  {
    id: 'inverter-output-phase-voltage-c',
    name: 'Inverter Output Phase Voltage C',
    nodeId: 'ns=4;i=152',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Output voltage from the inverter, Phase C.',
    category: 'three-phase',
    factor: 0.1, // 2437 -> 243.7V (Plausible)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-voltage',
    label: ''
  },
  // --- Index 138 ---
  {
    id: 'inverter-output-phase-current-a',
    name: 'Inverter Output Phase Current A',
    nodeId: 'ns=4;i=153',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Output current from the inverter, Phase A.',
    category: 'three-phase',
    factor: 0.01, // 790 -> 7.90A (More plausible than 79A)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-current',
    label: ''
  },
  // --- Index 139 ---
  {
    id: 'inverter-output-phase-current-b',
    name: 'Inverter Output Phase Current B',
    nodeId: 'ns=4;i=154',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Output current from the inverter, Phase B.',
    category: 'three-phase',
    factor: 0.01, // 630 -> 6.30A (Consistent)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-current',
    label: ''
  },
  // --- Index 140 ---
  {
    id: 'inverter-output-phase-current-c',
    name: 'Inverter Output Phase Current C',
    nodeId: 'ns=4;i=155',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'Output current from the inverter, Phase C.',
    category: 'three-phase',
    factor: 0.01, // 800 -> 8.00A (Consistent)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-current',
    label: ''
  },
  // --- Index 141 ---
  {
    id: 'inverter-output-phase-power-a',
    name: 'Inverter Output Phase Power A',
    nodeId: 'ns=4;i=156',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Output power from the inverter, Phase A.',
    category: 'three-phase',
    factor: 1, // 1890 -> 1890W (Plausible raw)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-power',
    label: ''
  },
  // --- Index 142 ---
  {
    id: 'inverter-output-phase-power-b',
    name: 'Inverter Output Phase Power B',
    nodeId: 'ns=4;i=157',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Output power from the inverter, Phase B.',
    category: 'three-phase',
    factor: 1, // 1566 -> 1566W (Plausible raw)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-power',
    label: ''
  },
  // --- Index 143 ---
  {
    id: 'inverter-output-phase-power-c',
    name: 'Inverter Output Phase Power C',
    nodeId: 'ns=4;i=158',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Output power from the inverter, Phase C.',
    category: 'three-phase',
    factor: 1, // 1982 -> 1982W (Plausible raw)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'inverter-output-power',
    label: ''
  },
  // --- Index 144 ---
  {
    id: 'inverter-output-total-power',
    name: 'Inverter Output Total Power',
    nodeId: 'ns=4;i=159',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total active power output from the inverter.',
    category: 'inverter',
    factor: 1, // 5438 -> 5438W (Sum matches phases, plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 145 ---
  {
    id: 'inverter-output-total-apparent-power',
    name: 'Inverter Output Total Apparent Power',
    nodeId: 'ns=4;i=160',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'VA',
    description: 'Total apparent power output from the inverter.',
    category: 'inverter',
    factor: 1, // 5438 -> 5438VA (Matches total W, implies PF=1? Check.)
    phase: 'x',
    label: ''
  },
  // --- Index 146 ---
  {
    id: 'inverter-frequency',
    name: 'Inverter Frequency',
    nodeId: 'ns=4;i=161',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: AudioWaveform,
    unit: 'Hz',
    min: 49.5,
    max: 50.5,
    description: 'Output frequency of the inverter.',
    category: 'inverter',
    factor: 0.01, // 5008 -> 50.08 Hz (Confirmed plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 147 ---
  {
    id: 'not-applicable-162',
    name: 'N/A_1 (i=162)',
    nodeId: 'ns=4;i=162',
    dataType: 'Int16',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unidentified data point at ns=4;i=162.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked N/A_1 in log. Identify purpose or remove.',
    label: ''
  },
  // --- Index 148 ---
  {
    id: 'ups-load-side-phase-power-a',
    name: 'UPS Load-Side Phase Power A',
    nodeId: 'ns=4;i=163',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load on the UPS/backup output, Phase A.',
    category: 'three-phase',
    factor: 1, // 1562 -> 1562W (Plausible raw)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'ups-load-power',
    label: ''
  },
  // --- Index 149 ---
  {
    id: 'ups-load-side-phase-power-b',
    name: 'UPS Load-Side Phase Power B',
    nodeId: 'ns=4;i=164',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load on the UPS/backup output, Phase B.',
    category: 'three-phase',
    factor: 1, // 17 -> 17W (Plausible raw)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'ups-load-power',
    label: ''
  },
  // --- Index 150 ---
  {
    id: 'ups-load-side-phase-power-c',
    name: 'UPS Load-Side Phase Power C',
    nodeId: 'ns=4;i=165',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load on the UPS/backup output, Phase C.',
    category: 'three-phase',
    factor: 1, // 1783 -> 1783W (Plausible raw)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'ups-load-power',
    label: ''
  },
  // --- Index 151 ---
  {
    id: 'ups-load-side-total-power',
    name: 'UPS Load-Side Total Power',
    nodeId: 'ns=4;i=166',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Total power consumed by the load on the UPS/backup output.',
    category: 'inverter', // Represents UPS output
    factor: 1, // 3362 -> 3362W (Sum matches phases, plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 152 ---
  {
    id: 'load-phase-voltage-a',
    name: 'Load Phase Voltage A',
    nodeId: 'ns=4;i=167',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Voltage measured at the load terminals, Phase A.',
    category: 'three-phase',
    factor: 0.1, // 2374 -> 237.4V (Plausible)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'load-voltage',
    label: ''
  },
  // --- Index 153 ---
  {
    id: 'load-phase-voltage-b',
    name: 'Load Phase Voltage B',
    nodeId: 'ns=4;i=168',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Voltage measured at the load terminals, Phase B.',
    category: 'three-phase',
    factor: 0.1, // 2458 -> 245.8V (Plausible)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'load-voltage',
    label: ''
  },
  // --- Index 154 ---
  {
    id: 'load-phase-voltage-c',
    name: 'Load Phase Voltage C',
    nodeId: 'ns=4;i=169',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'Voltage measured at the load terminals, Phase C.',
    category: 'three-phase',
    factor: 0.1, // 2429 -> 242.9V (Plausible)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'load-voltage',
    label: ''
  },
  // --- Index 155 ---
  {
    id: 'load-phase-current-a-no-use',
    name: 'Load Phase Current A (no use)',
    nodeId: 'ns=4;i=170',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    description: 'Load phase current A - marked as not used.',
    category: 'status', // Mark as status/unused
    factor: 1,
    phase: 'a',
    notes: 'Marked "no use" in log. Hide or remove.',
    label: ''
  },
  // --- Index 156 ---
  {
    id: 'load-phase-current-b-no-use',
    name: 'Load Phase Current B (no use)',
    nodeId: 'ns=4;i=171',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    description: 'Load phase current B - marked as not used.',
    category: 'status',
    factor: 1,
    phase: 'b',
    notes: 'Marked "no use" in log. Hide or remove.',
    label: ''
  },
  // --- Index 157 ---
  {
    id: 'load-phase-current-c-no-use',
    name: 'Load Phase Current C (no use)',
    nodeId: 'ns=4;i=172',
    dataType: 'Int16',
    uiType: 'display',
    icon: Waves,
    description: 'Load phase current C - marked as not used.',
    category: 'status',
    factor: 1,
    phase: 'c',
    notes: 'Marked "no use" in log. Hide or remove.',
    label: ''
  },
  // --- Index 158 ---
  {
    id: 'load-phase-power-a',
    name: 'Load Phase Power A',
    nodeId: 'ns=4;i=173',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load, measured on Phase A.',
    category: 'three-phase',
    factor: 1, // 1562 -> 1562W (Plausible raw)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'load-power',
    label: ''
  },
  // --- Index 159 ---
  {
    id: 'load-phase-power-b',
    name: 'Load Phase Power B',
    nodeId: 'ns=4;i=174',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load, measured on Phase B.',
    category: 'three-phase',
    factor: 1, // 17 -> 17W (Plausible raw)
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'load-power',
    label: ''
  },
  // --- Index 160 ---
  {
    id: 'load-phase-power-c',
    name: 'Load Phase Power C',
    nodeId: 'ns=4;i=175',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Power consumed by the load, measured on Phase C.',
    category: 'three-phase',
    factor: 1, // 1783 -> 1783W (Plausible raw)
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'load-power',
    label: ''
  },
  // --- Index 161 ---
  {
    id: 'load-total-power',
    name: 'Total Demand',
    nodeId: 'ns=4;i=176',
    dataType: 'Int16',
    uiType: 'display',
    icon: Lightbulb, // Icon representing load
    unit: 'kW',
    description: 'Total active power consumed by the load.',
    category: 'grid', // Load often relates to grid consumption/backup
    factor: 0.0001,
    phase: 'x',
    label: ''
  },
  // --- Index 162 ---
  {
    id: 'load-total-apparent-power', // Assuming total, despite "phase" in name
    name: 'Load Total Apparent Power',
    nodeId: 'ns=4;i=177',
    dataType: 'Int16',
    uiType: 'display',
    icon: Lightbulb,
    unit: 'VA',
    description: 'Total apparent power consumed by the load (undefined calculation method?).',
    category: 'grid',
    factor: 1, // 3362 -> 3362VA (Matches W, implies PF=1? Check.)
    phase: 'x',
    notes: 'Name mentions "undefine". Verify calculation if different from W.',
    label: ''
  },
  // --- Index 163 ---
  {
    id: 'load-frequency',
    name: 'Load Frequency',
    nodeId: 'ns=4;i=178',
    dataType: 'Int16',
    uiType: 'gauge',
    icon: AudioWaveform,
    unit: 'Hz',
    min: 49.5,
    max: 50.5,
    description: 'Frequency measured at the load terminals.',
    category: 'grid', // Related to the power supplied to load
    factor: 0.01, // 5008 -> 50.08 Hz (Confirmed plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 164 ---
  {
    id: 'input-power-pv1',
    name: 'Input Power PV1',
    nodeId: 'ns=4;i=180',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Instantaneous power generated by PV input 1.',
    category: 'pv',
    factor: 1, // 4838 -> 4838W (Plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 165 ---
  {
    id: 'input-power-pv2',
    name: 'Input Power PV2',
    nodeId: 'ns=4;i=181',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Instantaneous power generated by PV input 2.',
    category: 'pv',
    factor: 1, // 714 -> 714W (Plausible raw)
    phase: 'x',
    label: ''
  },
  // --- Index 166 ---
  {
    id: 'input-power-pv3',
    name: 'Input Power PV3',
    nodeId: 'ns=4;i=182',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Instantaneous power generated by PV input 3 (if applicable).',
    category: 'pv',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 167 ---
  {
    id: 'input-power-pv4',
    name: 'Input Power PV4',
    nodeId: 'ns=4;i=183',
    dataType: 'Int16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Instantaneous power generated by PV input 4 (if applicable).',
    category: 'pv',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 168 ---
  {
    id: 'dc-voltage-1',
    name: 'DC Voltage 1',
    nodeId: 'ns=4;i=184',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'DC voltage measurement point 1 (likely PV1 input).',
    category: 'pv', // Assuming PV related
    factor: 0.1, // 3845 -> 384.5V (Plausible for PV)
    phase: 'x',
    notes: 'Potentially redundant with vpv1 (i=28) or pv1-v-precise (i=55).',
    label: ''
  },
  // --- Index 169 ---
  {
    id: 'dc-current-1',
    name: 'DC Current 1',
    nodeId: 'ns=4;i=185',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'DC current measurement point 1 (likely PV1 input).',
    category: 'pv',
    factor: 0.1, // 124 -> 12.4A (Plausible for PV)
    phase: 'x',
    notes: 'Potentially redundant with ipv1 (i=30) or pv1-i-precise (i=56).',
    label: ''
  },
  // --- Index 170 ---
  {
    id: 'dc-voltage-2',
    name: 'DC Voltage 2',
    nodeId: 'ns=4;i=186',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'DC voltage measurement point 2 (likely PV2 input).',
    category: 'pv',
    factor: 0.1, // 1498 -> 149.8V (Plausible for PV)
    phase: 'x',
    notes: 'Potentially redundant with vpv2 (i=29) or pv2-v-precise (i=57).',
    label: ''
  },
  // --- Index 171 ---
  {
    id: 'dc-current-2',
    name: 'DC Current 2',
    nodeId: 'ns=4;i=187',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'DC current measurement point 2 (likely PV2 input).',
    category: 'pv',
    factor: 0.1, // 47 -> 4.7A (Plausible for PV)
    phase: 'x',
    notes: 'Potentially redundant with ipv2 (i=31) or pv2-i-precise (i=58).',
    label: ''
  },
  // --- Index 172 ---
  {
    id: 'dc-voltage-3',
    name: 'DC Voltage 3',
    nodeId: 'ns=4;i=188',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'DC voltage measurement point 3 (if applicable).',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: ''
  },
  // --- Index 173 ---
  {
    id: 'dc-current-3',
    name: 'DC Current 3',
    nodeId: 'ns=4;i=189',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'DC current measurement point 3 (if applicable).',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: ''
  },
  // --- Index 174 ---
  {
    id: 'dc-voltage-4',
    name: 'DC Voltage 4',
    nodeId: 'ns=4;i=190',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'DC voltage measurement point 4 (if applicable).',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: ''
  },
  // --- Index 175 ---
  {
    id: 'dc-current-4',
    name: 'DC Current 4',
    nodeId: 'ns=4;i=191',
    dataType: 'Int16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'DC current measurement point 4 (if applicable).',
    category: 'pv',
    factor: 0.1,
    phase: 'x',
    label: ''
  },
  // --- Index 176 ---
  {
    id: 'control-mode',
    name: 'Control Mode',
    nodeId: 'ns=4;i=193',
    dataType: 'Int16', // Mode code
    uiType: 'display',
    icon: Settings,
    unit: '', // Code
    description: 'Current battery/system control mode code.',
    category: 'control',
    factor: 1, // Raw code
    phase: 'x',
    notes: 'Value likely needs lookup table for description.',
    label: ''
  },
  // --- Index 177 ---
  {
    id: 'equalization-v',
    name: 'Equalization Voltage Setting',
    nodeId: 'ns=4;i=194',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Configured equalization charge voltage.',
    category: 'settings',
    factor: 0.01, // 5720 -> 57.20V (Plausible for lead-acid)
    phase: 'x',
    label: ''
  },
  // --- Index 178 ---
  {
    id: 'absorption-v',
    name: 'Absorption Voltage Setting',
    nodeId: 'ns=4;i=195',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Configured absorption charge voltage.',
    category: 'settings',
    factor: 0.01, // 5720 -> 57.20V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 179 ---
  {
    id: 'float-v',
    name: 'Float Voltage Setting',
    nodeId: 'ns=4;i=196',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Configured float charge voltage.',
    category: 'settings',
    factor: 0.01, // 5525 -> 55.25V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 180 ---
  {
    id: 'batt-capacity-setting',
    name: 'Battery Capacity Setting',
    nodeId: 'ns=4;i=197',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'Ah',
    description: 'Configured nominal battery capacity.',
    category: 'settings',
    factor: 1, // 1000 -> 1000Ah (Seems large, maybe 0.1 for 100Ah? Verify.)
    phase: 'x',
    notes: 'Factor 1 yields large capacity (1000Ah). Verify if scaling is needed.',
    label: ''
  },
  // --- Index 181 ---
  {
    id: 'empty-v',
    name: 'Empty Voltage Setting',
    nodeId: 'ns=4;i=198',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Configured battery voltage considered empty (cutoff).',
    category: 'settings',
    factor: 0.01, // 4500 -> 45.00V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 182 ---
  {
    id: 'zero-export-power-setting',
    name: 'Zero Export Power Setting',
    nodeId: 'ns=4;i=199',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W',
    description: 'Power threshold setting for zero export control.',
    category: 'settings',
    factor: 1, // 20 -> 20W (Plausible low threshold)
    phase: 'x',
    label: ''
  },
  // --- Index 183 ---
  {
    id: 'equalization-day-cycle',
    name: 'Equalization Day Cycle',
    nodeId: 'ns=4;i=200',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'days',
    description: 'Frequency of equalization charge in days.',
    category: 'settings',
    factor: 1, // 90 -> 90 days
    phase: 'x',
    label: ''
  },
  // --- Index 184 ---
  {
    id: 'equalization-time',
    name: 'Equalization Time',
    nodeId: 'ns=4;i=201',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'min', // Assuming minutes
    description: 'Duration of the equalization charge.',
    category: 'settings',
    factor: 1, // Assume raw minutes
    phase: 'x',
    label: ''
  },
  // --- Index 185 ---
  {
    id: 'tempco',
    name: 'TEMPCO',
    nodeId: 'ns=4;i=283',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'mV/°C/Cell', // Common unit, but needs confirmation
    description: 'Battery temperature compensation coefficient setting.',
    category: 'settings',
    factor: 1, // Unknown scaling
    phase: 'x',
    notes: 'Unit and factor need verification.',
    label: ''
  },
  // --- Index 186 ---
  {
    id: 'max-a-charge-battery-setting',
    name: 'Max Charge Current Setting',
    nodeId: 'ns=4;i=284',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'A',
    description: 'Maximum allowed battery charging current setting.',
    category: 'settings',
    factor: 0.1, // 200 -> 20.0A (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 187 ---
  {
    id: 'max-a-discharge-battery-setting',
    name: 'Max Discharge Current Setting',
    nodeId: 'ns=4;i=285',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'A',
    description: 'Maximum allowed battery discharging current setting.',
    category: 'settings',
    factor: 0.1, // 195 -> 19.5A (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 188 ---
  {
    id: 'lithium-battery-wakeup-sign-bit',
    name: 'Lithium Battery Wakeup Sign Bit',
    nodeId: 'ns=4;i=203',
    dataType: 'Boolean', // Treat Int16 0/1 as Boolean
    uiType: 'display',
    icon: Activity,
    description: 'Status bit indicating Lithium battery wakeup signal.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 189 ---
  {
    id: 'battery-resistance-value',
    name: 'Battery Resistance Value',
    nodeId: 'ns=4;i=204',
    dataType: 'Int16',
    uiType: 'display',
    icon: Gauge, // Represents an internal parameter
    unit: 'mΩ', // Assuming milliohms
    description: 'Measured or calculated internal battery resistance.',
    category: 'battery',
    factor: 1, // 25 -> 25mΩ (Plausible raw)
    phase: 'x',
    notes: 'Unit mΩ assumed.',
    label: ''
  },
  // --- Index 190 ---
  {
    id: 'battery-charging-efficiency-setting',
    name: 'Battery Charging Efficiency Setting',
    nodeId: 'ns=4;i=205',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%',
    description: 'Configured battery charging efficiency.',
    category: 'settings',
    factor: 0.1, // 990 -> 99.0% (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 191 ---
  {
    id: 'battery-capacity-shutdown-setting',
    name: 'Capacity Shutdown Setting (%)',
    nodeId: 'ns=4;i=206',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%',
    description: 'State of Charge (%) threshold to trigger shutdown.',
    category: 'settings',
    factor: 1, // 20 -> 20% (Plausible direct %)
    phase: 'x',
    label: ''
  },
  // --- Index 192 ---
  {
    id: 'battery-capacity-restart-setting',
    name: 'Capacity Restart Setting (%)',
    nodeId: 'ns=4;i=207',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%',
    description: 'State of Charge (%) threshold to allow restart after shutdown.',
    category: 'settings',
    factor: 1, // 50 -> 50% (Plausible direct %)
    phase: 'x',
    label: ''
  },
  // --- Index 193 ---
  {
    id: 'battery-capacity-low-battery-setting',
    name: 'Capacity Low Battery Setting (%)',
    nodeId: 'ns=4;i=208',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%',
    description: 'State of Charge (%) threshold to indicate low battery warning.',
    category: 'settings',
    factor: 1, // 20 -> 20% (Plausible direct %)
    phase: 'x',
    label: ''
  },
  // --- Index 194 ---
  {
    id: 'battery-voltage-shutdown-setting',
    name: 'Voltage Shutdown Setting',
    nodeId: 'ns=4;i=209',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Battery voltage threshold to trigger shutdown.',
    category: 'settings',
    factor: 0.01, // 4600 -> 46.00V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 195 ---
  {
    id: 'battery-voltage-restart-setting',
    name: 'Voltage Restart Setting',
    nodeId: 'ns=4;i=210',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Battery voltage threshold to allow restart after shutdown.',
    category: 'settings',
    factor: 0.01, // 5200 -> 52.00V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 196 ---
  {
    id: 'battery-voltage-low-battery-setting',
    name: 'Voltage Low Battery Setting',
    nodeId: 'ns=4;i=211',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Battery voltage threshold to indicate low battery warning.',
    category: 'settings',
    factor: 0.01, // 4750 -> 47.50V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 197 ---
  {
    id: 'grid-charging-start-voltage-point-setting',
    name: 'Grid Charging Start Voltage Setting',
    nodeId: 'ns=4;i=213',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V',
    description: 'Battery voltage threshold below which grid charging can start.',
    category: 'settings',
    factor: 0.01, // 4900 -> 49.00V (Plausible)
    phase: 'x',
    label: ''
  },
  // --- Index 198 ---
  {
    id: 'grid-charging-start-capacity-point-setting',
    name: 'Grid Charging Start Capacity Setting',
    nodeId: 'ns=4;i=214',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%',
    description: 'Battery State of Charge (%) threshold below which grid charging can start.',
    category: 'settings',
    factor: 1, // 40 -> 40% (Plausible direct %)
    phase: 'x',
    label: ''
  },
  // --- Index 199 ---
  {
    id: 'grid-charge-battery-current-setting',
    name: 'Grid Charge Battery Current Setting',
    nodeId: 'ns=4;i=215',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'A',
    description: 'Maximum current allowed when charging the battery from the grid.',
    category: 'settings',
    factor: 0.1, // 40 -> 4.0A (Plausible, depends on system size)
    phase: 'x',
    label: ''
  },

  // NOTE: Entries from index 200 onwards are excluded as per the request.
  // Adding placeholders for some existing items from the original prompt for context
    {
      id: 'frequency',
      name: 'Frequency',
      nodeId: 'ns=4;i=346',
      dataType: 'Float',
      uiType: 'display',
      icon: AudioWaveform,
      unit: ' Hz',
      min: 49.8,
      max: 50.2,
      category: 'grid', // More appropriate than battery
      description: 'Current Frequency (Placeholder from original).',
      factor: 1, // Float usually doesn't need factor unless specified
      phase: 'x',
      notes: "Included from original prompt example - Index > 199",
      label: ''
    },
  // --- Index 200 ---
  {
    id: createId('Grid Charged Enable'),
    name: 'Grid Charged Enable',
    nodeId: 'ns=4;i=217',
    dataType: 'Int16', // Assuming 0/1 indicates status/setting
    uiType: 'display', // Display status rather than direct control switch
    icon: Info, // Or Settings if it's primarily a setting
    description: 'Indicates if charging from the grid is enabled or allowed based on conditions.',
    category: 'settings', // Or 'status' depending on primary use
    factor: 1,
    phase: 'x',
    notes: 'Might be a boolean status (0/1). Confirm if read-only or writable setting.',
    label: ''
  },
  // --- Index 201 ---
  {
    id: createId('AC Couple'),
    name: 'AC Couple Setting/Status',
    nodeId: 'ns=4;i=218',
    dataType: 'Int16', // Likely 0/1
    uiType: 'display', // Or 'switch' if configurable
    icon: Settings, // Or Waypoints if representing connection status
    description: 'AC Coupling feature setting or status.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Confirm if a setting (e.g., enable/disable) or a status.',
    label: ''
  },
  // --- Index 202 ---
  {
    id: createId('Energy Management model'),
    name: 'Energy Management Model',
    nodeId: 'ns=4;i=220',
    dataType: 'Int16', // Mode code
    uiType: 'display',
    icon: Settings,
    description: 'Selected Energy Management strategy model code.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value is a code requiring a lookup table for description.',
    label: ''
  },
  // --- Index 203 ---
  {
    id: createId('Limit Control function'),
    name: 'Limit Control Function',
    nodeId: 'ns=4;i=221',
    dataType: 'Int16', // Assuming 0/1 for enable/disable
    uiType: 'switch', // Assumed to be a controllable setting
    icon: ToggleRight, // Default to ToggleRight, UI can show correct state
    description: 'Enable/Disable the Limit Control function (e.g., export/import limits).',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 204 ---
  {
    id: createId('Limit max grid power output'),
    name: 'Max Grid Power Output Limit',
    nodeId: 'ns=4;i=222',
    dataType: 'Int16',
    uiType: 'display', // Setting value
    icon: Settings,
    unit: 'W', // Assumed unit
    description: 'Maximum power output allowed to the grid setting.',
    category: 'control',
    factor: 1, // Assume raw Watts, verify scaling
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed. Verify required scaling.',
    label: ''
  },
  // --- Index 205 ---
  // { 
  //   id: createId('Unknown i223'),
  //   name: 'Unknown (i=223)',
  //   nodeId: 'ns=4;i=223',
  //   dataType: 'Int16',
  //   uiType: 'display',
  //   icon: HelpCircle,
  //   description: 'Unidentified data point at ns=4;i=223.',
  //   category: 'status',
  //   factor: 1,
  //   phase: 'x',
  //   notes: 'Marked as "-" in log. Identify purpose or remove.',
  // },
  // --- Index 206 ---
  {
    id: createId('Solar sell enable'),
    name: 'Solar Sell Enable',
    nodeId: 'ns=4;i=224',
    dataType: 'Int16', // Map BYTE to Int16, assume 0/1
    uiType: 'switch', // Assumed controllable setting
    icon: ToggleRight, // Default state
    description: 'Enable/Disable selling solar power to the grid.',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 207 ---
  {
    id: createId('Time of use selling enabled'),
    name: 'Time of Use Selling Enabled',
    nodeId: 'ns=4;i=225',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch', // Assumed controllable setting
    icon: ToggleRight, // Default state
    description: 'Enable/Disable selling power based on Time of Use schedule.',
    category: 'control',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 208 ---
  {
    id: createId('Grid Phase setting'),
    name: 'Grid Phase Setting',
    nodeId: 'ns=4;i=226',
    dataType: 'Int16', // Code
    uiType: 'display',
    icon: Settings,
    description: 'Configured grid phase type (e.g., Single Phase, Three Phase).',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value is a code requiring lookup (e.g., 1=Single, 3=Three).',
    label: ''
  },
  // --- Index 209 ---
  {
    id: createId('Sell mode time point 1'),
    name: 'Sell Mode Time Point 1',
    nodeId: 'ns=4;i=227',
    dataType: 'Int16', // Encoded time?
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 1 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 210 ---
  {
    id: createId('Sell mode time point 2'),
    name: 'Sell Mode Time Point 2',
    nodeId: 'ns=4;i=228',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 2 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 211 ---
  {
    id: createId('Sell mode time point 3'),
    name: 'Sell Mode Time Point 3',
    nodeId: 'ns=4;i=229',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 3 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 212 ---
  {
    id: createId('Sell mode time point 4'),
    name: 'Sell Mode Time Point 4',
    nodeId: 'ns=4;i=230',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 4 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 213 ---
  {
    id: createId('Sell mode time point 5'),
    name: 'Sell Mode Time Point 5',
    nodeId: 'ns=4;i=231',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 5 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 214 ---
  {
    id: createId('Sell mode time point 6'),
    name: 'Sell Mode Time Point 6',
    nodeId: 'ns=4;i=232',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    description: 'Time of Use - Sell Mode Time Point 6 Setting.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value likely needs decoding (e.g., HHMM format?).',
    label: ''
  },
  // --- Index 215 ---
  {
    id: createId('Sell mode power 1'),
    name: 'Sell Mode Power Setting 1',
    nodeId: 'ns=4;i=233',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 1.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 216 ---
  {
    id: createId('Sell mode power 2'),
    name: 'Sell Mode Power Setting 2',
    nodeId: 'ns=4;i=234',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 2.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 217 ---
  {
    id: createId('Sell mode power 3'),
    name: 'Sell Mode Power Setting 3',
    nodeId: 'ns=4;i=235',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 3.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 218 ---
  {
    id: createId('Sell mode power 4'),
    name: 'Sell Mode Power Setting 4',
    nodeId: 'ns=4;i=236',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 4.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 219 ---
  {
    id: createId('Sell mode power 5'),
    name: 'Sell Mode Power Setting 5',
    nodeId: 'ns=4;i=237',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 5.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 220 ---
  {
    id: createId('Sell mode power 6'),
    name: 'Sell Mode Power Setting 6',
    nodeId: 'ns=4;i=238',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Time of Use - Power Setting for Time Point 6.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 221 ---
  {
    id: createId('Sell mode voltage 1'),
    name: 'Sell Mode Voltage Setting 1',
    nodeId: 'ns=4;i=239',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 1.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose (limit/target?), unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 222 ---
  {
    id: createId('Sell mode voltage 2'),
    name: 'Sell Mode Voltage Setting 2',
    nodeId: 'ns=4;i=240',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 2.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose, unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 223 ---
  {
    id: createId('Sell mode voltage 3'),
    name: 'Sell Mode Voltage Setting 3',
    nodeId: 'ns=4;i=241',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 3.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose, unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 224 ---
  {
    id: createId('Sell mode voltage 4'),
    name: 'Sell Mode Voltage Setting 4',
    nodeId: 'ns=4;i=242',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 4.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose, unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 225 ---
  {
    id: createId('Sell mode voltage 5'),
    name: 'Sell Mode Voltage Setting 5',
    nodeId: 'ns=4;i=243',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 5.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose, unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 226 ---
  {
    id: createId('Sell mode voltage 6'),
    name: 'Sell Mode Voltage Setting 6',
    nodeId: 'ns=4;i=244',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'V', // Assumed
    description: 'Time of Use - Voltage Limit/Target for Time Point 6.',
    category: 'settings',
    factor: 0.1, // Assume V * 10
    phase: 'x',
    notes: 'Purpose, unit (V), and factor (0.1) assumed.',
    label: ''
  },
  // --- Index 227 ---
  {
    id: createId('Sell mode capacity 1'),
    name: 'Sell Mode Capacity Setting 1',
    nodeId: 'ns=4;i=245',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 1.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose (limit/target?) and unit (%) assumed.',
    label: ''
  },
  // --- Index 228 ---
  {
    id: createId('Sell mode capacity 2'),
    name: 'Sell Mode Capacity Setting 2',
    nodeId: 'ns=4;i=246',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 2.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose and unit (%) assumed.',
    label: ''
  },
  // --- Index 229 ---
  {
    id: createId('Sell mode capacity 3'),
    name: 'Sell Mode Capacity Setting 3',
    nodeId: 'ns=4;i=247',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 3.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose and unit (%) assumed.',
    label: ''
  },
  // --- Index 230 ---
  {
    id: createId('Sell mode capacity 4'),
    name: 'Sell Mode Capacity Setting 4',
    nodeId: 'ns=4;i=248',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 4.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose and unit (%) assumed.',
    label: ''
  },
  // --- Index 231 ---
  {
    id: createId('Sell mode capacity 5'),
    name: 'Sell Mode Capacity Setting 5',
    nodeId: 'ns=4;i=249',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 5.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose and unit (%) assumed.',
    label: ''
  },
  // --- Index 232 ---
  {
    id: createId('Sell mode capacity 6'),
    name: 'Sell Mode Capacity Setting 6',
    nodeId: 'ns=4;i=250',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: '%', // Assumed SoC %
    description: 'Time of Use - Battery Capacity (SoC) Limit/Target for Time Point 6.',
    category: 'settings',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Purpose and unit (%) assumed.',
    label: ''
  },
  // --- Index 233 ---
  {
    id: createId('Charge mode enable 1'),
    name: 'Charge Mode Enable Setting 1',
    nodeId: 'ns=4;i=251',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch', // Assumed controllable
    icon: ToggleRight, // Default state
    description: 'Time of Use - Enable charging during Time Point 1.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 234 ---
  {
    id: createId('Charge mode enable 2'),
    name: 'Charge Mode Enable Setting 2',
    nodeId: 'ns=4;i=252',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Time of Use - Enable charging during Time Point 2.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 235 ---
  {
    id: createId('Charge mode enable 3'),
    name: 'Charge Mode Enable Setting 3',
    nodeId: 'ns=4;i=253',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Time of Use - Enable charging during Time Point 3.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 236 ---
  {
    id: createId('Charge mode enable 4'),
    name: 'Charge Mode Enable Setting 4',
    nodeId: 'ns=4;i=254',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Time of Use - Enable charging during Time Point 4.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 237 ---
  {
    id: createId('Charge mode enable 5'),
    name: 'Charge Mode Enable Setting 5',
    nodeId: 'ns=4;i=255',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Time of Use - Enable charging during Time Point 5.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 238 ---
  {
    id: createId('Charge mode enable 6'),
    name: 'Charge Mode Enable Setting 6',
    nodeId: 'ns=4;i=256',
    dataType: 'Int16', // Assume 0/1
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Time of Use - Enable charging during Time Point 6.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 239 ---
  {
    id: createId('Grid Mode'),
    name: 'Grid Mode',
    nodeId: 'ns=4;i=258',
    dataType: 'Int16', // Mode code
    uiType: 'display',
    icon: Settings, // Or Info if status
    description: 'Current grid interaction mode code.',
    category: 'settings', // Or status
    factor: 1,
    phase: 'x',
    notes: 'Value requires lookup table.',
    label: ''
  },
  // --- Index 240 ---
  {
    id: createId('Grid Frequency Setting'),
    name: 'Grid Frequency Setting',
    nodeId: 'ns=4;i=259',
    dataType: 'Int16', // Code or scaled value
    uiType: 'display',
    icon: Settings,
    unit: 'Hz', // Assumed unit if scaled
    description: 'Configured nominal grid frequency (e.g., 50Hz, 60Hz).',
    category: 'settings',
    factor: 0.01, // Assume Hz * 100 if scaled
    phase: 'x',
    notes: 'Assume factor 0.01 if value represents 5000/6000 etc.',
    label: ''
  },
  // --- Index 241 ---
  {
    id: createId('Grid Type Setting'),
    name: 'Grid Type Setting',
    nodeId: 'ns=4;i=260',
    dataType: 'Int16', // Code
    uiType: 'display',
    icon: Settings,
    description: 'Configured grid type code (e.g., TN, TT, IT).',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value requires lookup table.',
    label: ''
  },
  // --- Index 242 ---
  {
    id: createId('Grid Voltage High Limit Setting'), // More descriptive ID
    name: 'Grid Voltage High Limit Setting',
    nodeId: 'ns=4;i=261',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'V',
    description: 'Upper voltage limit setting for grid connection (possibly redundant).',
    category: 'settings',
    factor: 0.1, // Consistent with previous V limits
    phase: 'x',
    notes: 'Potentially redundant with i=6.',
    label: ''
  },
  // --- Index 243 ---
  {
    id: createId('Grid Voltage Low Limit Setting'), // More descriptive ID
    name: 'Grid Voltage Low Limit Setting',
    nodeId: 'ns=4;i=262',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'V',
    description: 'Lower voltage limit setting for grid connection (possibly redundant).',
    category: 'settings',
    factor: 0.1, // Consistent with previous V limits
    phase: 'x',
    notes: 'Potentially redundant with i=5.',
    label: ''
  },
  // --- Index 244 ---
  {
    id: createId('Grid Hz High Limit Setting'), // More descriptive ID
    name: 'Grid Hz High Limit Setting',
    nodeId: 'ns=4;i=263',
    dataType: 'Int16',
    uiType: 'display',
    icon: Maximize2,
    unit: 'Hz',
    description: 'Upper frequency limit setting for grid connection (possibly redundant).',
    category: 'settings',
    factor: 0.01, // Consistent with previous Hz limits
    phase: 'x',
    notes: 'Potentially redundant with i=8.',
    label: ''
  },
  // --- Index 245 ---
  {
    id: createId('Grid Hz Low Limit Setting'), // More descriptive ID
    name: 'Grid Hz Low Limit Setting',
    nodeId: 'ns=4;i=264',
    dataType: 'Int16',
    uiType: 'display',
    icon: Minimize2,
    unit: 'Hz',
    description: 'Lower frequency limit setting for grid connection (possibly redundant).',
    category: 'settings',
    factor: 0.01, // Consistent with previous Hz limits
    phase: 'x',
    notes: 'Potentially redundant with i=7.',
    label: ''
  },
  // --- Index 246 ---
  {
    id: createId('Generator connected to grid input'),
    name: 'Generator Connected to Grid Input',
    nodeId: 'ns=4;i=265',
    dataType: 'Int16', // Assume 0/1 status or setting
    uiType: 'display', // Assume status display
    icon: Power, // Icon representing generator/power source
    description: 'Indicates if a generator is connected to the grid input terminal.',
    category: 'settings', // Or status
    factor: 1,
    phase: 'x',
    notes: 'Confirm if status or setting.',
    label: ''
  },
  // --- Index 247 ---
  {
    id: createId('Generator peak shaving power'),
    name: 'Generator Peak Shaving Power',
    nodeId: 'ns=4;i=266',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Power setting for generator peak shaving function.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 248 ---
  {
    id: createId('Grid peak shaving Power'),
    name: 'Grid Peak Shaving Power',
    nodeId: 'ns=4;i=267',
    dataType: 'Int16',
    uiType: 'display',
    icon: Settings,
    unit: 'W', // Assumed
    description: 'Power setting for grid peak shaving function.',
    category: 'settings',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Unit (W) and factor (1) assumed.',
    label: ''
  },
  // --- Index 249 ---
  {
    id: createId('UPS Delay time'),
    name: 'UPS Delay Time',
    nodeId: 'ns=4;i=269',
    dataType: 'Int16',
    uiType: 'display',
    icon: Clock,
    unit: 's', // Assumed seconds
    description: 'Delay time setting related to UPS/backup mode transition.',
    category: 'settings',
    factor: 1, // Assume raw seconds
    phase: 'x',
    notes: 'Unit (s) and factor (1) assumed.',
    label: ''
  },
  // --- Index 250 ---
  {
    id: createId('BMS Charging Voltage Limit'), // BMS specific
    name: 'BMS Charging Voltage Limit',
    nodeId: 'ns=4;i=270',
    dataType: 'Int16',
    uiType: 'display', // Display limit from BMS
    icon: Battery,
    unit: 'V',
    description: 'Maximum charging voltage limit reported by BMS.',
    category: 'battery',
    factor: 0.01, // Assume V * 100
    phase: 'x',
    notes: 'Factor 0.01 assumed.',
    label: ''
  },
  // --- Index 251 ---
  {
    id: createId('BMS Discharging Voltage Limit'), // BMS specific
    name: 'BMS Discharging Voltage Limit',
    nodeId: 'ns=4;i=271',
    dataType: 'Int16',
    uiType: 'display', // Display limit from BMS
    icon: Battery,
    unit: 'V',
    description: 'Minimum discharging voltage limit reported by BMS.',
    category: 'battery',
    factor: 0.01, // Assume V * 100
    phase: 'x',
    notes: 'Factor 0.01 assumed.',
    label: ''
  },
  // --- Index 252 ---
  {
    id: createId('BMS Charging current limiting'), // BMS specific
    name: 'BMS Charging Current Limit',
    nodeId: 'ns=4;i=272',
    dataType: 'Int16',
    uiType: 'display', // Display limit from BMS
    icon: Battery,
    unit: 'A',
    description: 'Maximum charging current limit reported by BMS.',
    category: 'battery',
    factor: 0.1, // Assume A * 10
    phase: 'x',
    notes: 'Factor 0.1 assumed.',
    label: ''
  },
  // --- Index 253 ---
  {
    id: createId('BMS Discharge current limiting'), // BMS specific
    name: 'BMS Discharge Current Limit',
    nodeId: 'ns=4;i=273',
    dataType: 'Int16',
    uiType: 'display', // Display limit from BMS
    icon: Battery,
    unit: 'A',
    description: 'Maximum discharging current limit reported by BMS.',
    category: 'battery',
    factor: 0.1, // Assume A * 10
    phase: 'x',
    notes: 'Factor 0.1 assumed.',
    label: ''
  },
  // --- Index 254 ---
  {
    id: createId('BMS Real time capacity'), // BMS specific
    name: 'BMS Real Time Capacity (SoC)',
    nodeId: 'ns=4;i=274',
    dataType: 'Int16',
    uiType: 'gauge', // Good candidate for gauge
    icon: Battery,
    unit: '%',
    min: 0,
    max: 100,
    description: 'Real-time State of Charge reported by BMS.',
    category: 'battery',
    factor: 1, // Assume direct %
    phase: 'x',
    label: ''
  },
  // --- Index 255 ---
  {
    id: createId('BMS Real time voltage'), // BMS specific
    name: 'BMS Real Time Voltage',
    nodeId: 'ns=4;i=275',
    dataType: 'Int16',
    uiType: 'gauge', // Good candidate for gauge
    icon: Battery,
    unit: 'V',
    min: 40, // Example range
    max: 58, // Example range
    description: 'Real-time voltage reported by BMS.',
    category: 'battery',
    factor: 0.01, // Assume V * 100
    phase: 'x',
    notes: 'Factor 0.01 assumed.',
    label: ''
  },
  // --- Index 256 ---
  {
    id: createId('BMS Real time current'), // BMS specific
    name: 'BMS Real Time Current',
    nodeId: 'ns=4;i=276',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery,
    unit: 'A',
    description: 'Real-time current reported by BMS (Positive=charging, Negative=discharging).',
    category: 'battery',
    factor: 0.1, // Assume A * 10
    phase: 'x',
    notes: 'Factor 0.1 assumed. Verify sign convention.',
    label: ''
  },
  // --- Index 257 ---
  {
    id: createId('BMS Real Time temp'), // BMS specific
    name: 'BMS Real Time Temperature',
    nodeId: 'ns=4;i=277',
    dataType: 'Int16',
    uiType: 'gauge', // Good candidate for gauge
    icon: Thermometer,
    unit: '°C',
    min: -10, // Example range
    max: 60, // Example range
    description: 'Real-time temperature reported by BMS.',
    category: 'battery',
    factor: (1 / 4095) * 100, // 1280 -> 128.0C still seems high, but using scaling
    phase: 'x',
    notes: 'Factor F to  C  yields high temp (128C from log). Verify scaling.',
    label: ''
  },
  // --- Index 258 ---
  {
    id: createId('BMS Maximum charge current limiting'), // BMS specific, redundancy?
    name: 'BMS Maximum Charge Current Limit',
    nodeId: 'ns=4;i=278',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery, // Or Settings if it's an overall max
    unit: 'A',
    description: 'Absolute maximum charging current limit reported by BMS.',
    category: 'battery',
    factor: 0.1, // Assume A * 10
    phase: 'x',
    notes: 'Factor 0.1 assumed. Check difference from i=272.',
    label: ''
  },
  // --- Index 259 ---
  {
    id: createId('BMS Maximum discharge current limiting'), // BMS specific, redundancy?
    name: 'BMS Maximum Discharge Current Limit',
    nodeId: 'ns=4;i=279',
    dataType: 'Int16',
    uiType: 'display',
    icon: Battery, // Or Settings if it's an overall max
    unit: 'A',
    description: 'Absolute maximum discharging current limit reported by BMS.',
    category: 'battery',
    factor: 0.1, // Assume A * 10
    phase: 'x',
    notes: 'Factor 0.1 assumed. Check difference from i=273.',
    label: ''
  },
  // --- Index 260 ---
  {
    id: createId('Lithium battery type'),
    name: 'Lithium Battery Type',
    nodeId: 'ns=4;i=281',
    dataType: 'Int16', // Code
    uiType: 'display',
    icon: Settings,
    description: 'Configured type/protocol code for Lithium battery communication.',
    category: 'settings',
    factor: 1,
    phase: 'x',
    notes: 'Value requires lookup table.',
    label: ''
  },
  // --- Index 261 ---
  {
    id: createId('Lithium Battery SOH'),
    name: 'Lithium Battery SOH',
    nodeId: 'ns=4;i=282',
    dataType: 'Int16', // Percentage
    uiType: 'gauge',
    icon: Battery,
    unit: '%',
    min: 0,
    max: 100,
    description: 'Battery State of Health reported by BMS or calculated.',
    category: 'battery',
    factor: 1, // Assume direct %
    phase: 'x',
    notes: 'Unit (%) and factor (1) assumed.',
    label: ''
  },
  // --- Index 262 ---
  {
    id: createId('Power On Allow On Grid Self Test'),
    name: 'Power On (Allow Grid Self Test)',
    nodeId: 'ns=4;i=287',
    dataType: 'Boolean', // Map UInt16 trigger to Boolean action
    uiType: 'button',
    icon: Power,
    description: 'Command to Power On the inverter (allowing grid self-test).',
    category: 'control',
    factor: 1, // N/A for button trigger
    phase: 'x',
    notes: 'This is likely a write-only command trigger.',
    label: ''
  },
  // --- Index 263 ---
  {
    id: createId('Power Off Not Allow On Grid Self Test 1'),
    name: 'Power Off (Disallow Grid Self Test)',
    nodeId: 'ns=4;i=288',
    dataType: 'Boolean', // Map UInt16 trigger to Boolean action
    uiType: 'button',
    icon: Power,
    description: 'Command to Power Off the inverter (disallowing grid self-test).',
    category: 'control',
    factor: 1, // N/A for button trigger
    phase: 'x',
    notes: 'This is likely a write-only command trigger. Purpose of "_1" unclear.',
    label: ''
  },
  // --- Index 264 ---
  {
    id: createId('Restart command'),
    name: 'Restart Command',
    nodeId: 'ns=4;i=289',
    dataType: 'UInt16',
    uiType: 'button',
    icon: Activity, // Icon for restart/refresh
    description: 'Command to restart the inverter.',
    category: 'control',
    factor: 1, // N/A for button trigger
    phase: 'x',
    notes: 'This is likely a write-only command trigger.',
    label: ''
  },
  // --- Index 265 ---
  {
    id: createId('Meter Current A'), // Meter specific
    name: 'Meter Current A',
    nodeId: 'ns=4;i=291',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Current Phase A.',
    category: 'three-phase',
    factor: 1, // Float assumed raw
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current',
    label: ''
  },
  // --- Index 266 ---
  {
    id: createId('Meter Current B'), // Meter specific
    name: 'Meter Current B',
    nodeId: 'ns=4;i=292',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Current Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current',
    label: ''
  },
  // --- Index 267 ---
  {
    id: createId('Meter Current C'), // Meter specific
    name: 'Meter Current C',
    nodeId: 'ns=4;i=293',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Current Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current',
    label: ''
  },
  // --- Index 268 ---
  {
    id: createId('Meter Current N'), // Meter specific
    name: 'Meter Current N',
    nodeId: 'ns=4;i=294',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Current Neutral.',
    category: 'grid', // Neutral current is system-wide
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 269 ---
  {
    id: createId('Meter Current G'), // Meter specific
    name: 'Meter Current G',
    nodeId: 'ns=4;i=295',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Current Ground (Leakage?).',
    category: 'grid',
    factor: 1,
    phase: 'x', // Ground isn't a phase
    notes: 'Verify if this is Ground/PE current.',
    label: ''
  },
  // --- Index 270 ---
  {
    id: createId('Meter Current Avg'), // Meter specific
    name: 'Meter Current Avg',
    nodeId: 'ns=4;i=296',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'A',
    description: 'External Meter - Average Phase Current.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 271 ---
  {
    id: createId('Meter Current Unbalance A'), // Meter specific
    name: 'Meter Current Unbalance A',
    nodeId: 'ns=4;i=297',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed percentage
    description: 'External Meter - Current Unbalance Phase A (deviation from avg).',
    category: 'three-phase',
    factor: 1, // Assume raw percentage
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current-unbalance',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 272 ---
  {
    id: createId('Meter Current Unbalance B'), // Meter specific
    name: 'Meter Current Unbalance B',
    nodeId: 'ns=4;i=298',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Current Unbalance Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current-unbalance',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 273 ---
  {
    id: createId('Meter Current Unbalance C'), // Meter specific
    name: 'Meter Current Unbalance C',
    nodeId: 'ns=4;i=299',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Current Unbalance Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-current-unbalance',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 274 ---
  {
    id: createId('Meter Current Unbalance Worst'), // Meter specific
    name: 'Meter Current Unbalance Worst',
    nodeId: 'ns=4;i=300',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Worst Phase Current Unbalance.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 275 ---
  {
    id: createId('Meter Voltage A-B'), // Meter specific
    name: 'Meter Voltage A-B',
    nodeId: 'ns=4;i=301',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Line Voltage A-B.',
    category: 'three-phase',
    factor: 1,
    phase: 'x', // Represents L-L
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ll',
    label: ''
  },
  // --- Index 276 ---
  {
    id: createId('Meter Voltage B-C'), // Meter specific
    name: 'Meter Voltage B-C',
    nodeId: 'ns=4;i=302',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Line Voltage B-C.',
    category: 'three-phase',
    factor: 1,
    phase: 'x',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ll',
    label: ''
  },
  // --- Index 277 ---
  {
    id: createId('Meter Voltage C-A'), // Meter specific
    name: 'Meter Voltage C-A',
    nodeId: 'ns=4;i=303',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Line Voltage C-A.',
    category: 'three-phase',
    factor: 1,
    phase: 'x',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ll',
    label: ''
  },
  // --- Index 278 ---
  {
    id: createId('Meter Voltage L-L Avg'), // Meter specific
    name: 'Meter Voltage L-L Avg',
    nodeId: 'ns=4;i=304',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Average Line-to-Line Voltage.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 279 ---
  {
    id: createId('Meter Voltage A-N'), // Meter specific
    name: 'Meter Voltage A-N',
    nodeId: 'ns=4;i=305',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Neutral Voltage A-N.',
    category: 'three-phase',
    factor: 1,
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ln',
    label: ''
  },
  // --- Index 280 ---
  {
    id: createId('Meter Voltage B-N'), // Meter specific
    name: 'Meter Voltage B-N',
    nodeId: 'ns=4;i=306',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Neutral Voltage B-N.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ln',
    label: ''
  },
  // --- Index 281 ---
  {
    id: createId('Meter Voltage C-N'), // Meter specific
    name: 'Meter Voltage C-N',
    nodeId: 'ns=4;i=307',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Line-to-Neutral Voltage C-N.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-ln',
    label: ''
  },
  // --- Index 282 ---
  {
    id: createId('Meter Not use i308'),
    name: 'Meter Not use (i=308)',
    nodeId: 'ns=4;i=308',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point at ns=4;i=308.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use" in log.',
    label: ''
  },
  // --- Index 283 ---
  {
    id: createId('Meter Voltage L-N Avg'), // Meter specific
    name: 'Meter Voltage L-N Avg',
    nodeId: 'ns=4;i=309',
    dataType: 'Float',
    uiType: 'display',
    icon: Waves,
    unit: 'V',
    description: 'External Meter - Average Line-to-Neutral Voltage.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 284 ---
  {
    id: createId('Meter Voltage Unbalance A-B'), // Meter specific
    name: 'Meter Voltage Unbalance A-B',
    nodeId: 'ns=4;i=310',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-L A-B.',
    category: 'three-phase',
    factor: 1,
    phase: 'x',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ll',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 285 ---
  {
    id: createId('Meter Voltage Unbalance B-C'), // Meter specific
    name: 'Meter Voltage Unbalance B-C',
    nodeId: 'ns=4;i=311',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-L B-C.',
    category: 'three-phase',
    factor: 1,
    phase: 'x',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ll',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 286 ---
  {
    id: createId('Meter Voltage Unbalance C-A'), // Meter specific
    name: 'Meter Voltage Unbalance C-A',
    nodeId: 'ns=4;i=312',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-L C-A.',
    category: 'three-phase',
    factor: 1,
    phase: 'x',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ll',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 287 ---
  {
    id: createId('Meter Voltage Unbalance L-L Worst'), // Meter specific
    name: 'Meter Voltage Unbalance L-L Worst',
    nodeId: 'ns=4;i=313',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Worst Line-to-Line Voltage Unbalance.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 288 ---
  {
    id: createId('Meter Voltage Unbalance A-N'), // Meter specific
    name: 'Meter Voltage Unbalance A-N',
    nodeId: 'ns=4;i=314',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-N Phase A.',
    category: 'three-phase',
    factor: 1,
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ln',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 289 ---
  {
    id: createId('Meter Voltage Unbalance B-N'), // Meter specific
    name: 'Meter Voltage Unbalance B-N',
    nodeId: 'ns=4;i=315',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-N Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ln',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 290 ---
  {
    id: createId('Meter Voltage Unbalance C-N'), // Meter specific
    name: 'Meter Voltage Unbalance C-N',
    nodeId: 'ns=4;i=316',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Voltage Unbalance L-N Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-voltage-unbalance-ln',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 291 ---
  {
    id: createId('Meter Voltage Unbalance L-N Worst'), // Meter specific
    name: 'Meter Voltage Unbalance L-N Worst',
    nodeId: 'ns=4;i=317',
    dataType: 'Float',
    uiType: 'display',
    icon: Percent,
    unit: '%', // Assumed
    description: 'External Meter - Worst Line-to-Neutral Voltage Unbalance.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    notes: 'Unit (%) assumed.',
    label: ''
  },
  // --- Index 292 ---
  {
    id: createId('Meter Active Power A'), // Meter specific
    name: 'Meter Active Power A',
    nodeId: 'ns=4;i=318',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'W', // Assumed Watts
    description: 'External Meter - Active Power Phase A.',
    category: 'three-phase',
    factor: 1, // Assume raw Watts
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-active-power',
    label: ''
  },
  // --- Index 293 ---
  {
    id: createId('Meter Active Power B'), // Meter specific
    name: 'Meter Active Power B',
    nodeId: 'ns=4;i=319',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'External Meter - Active Power Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-active-power',
    label: ''
  },
  // --- Index 294 ---
  {
    id: createId('Meter Active Power C'), // Meter specific
    name: 'Meter Active Power C',
    nodeId: 'ns=4;i=320',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'External Meter - Active Power Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-active-power',
    label: ''
  },
  // --- Index 295 ---
  {
    id: createId('Meter Active Power Total'), // Meter specific
    name: 'Meter Active Power Total',
    nodeId: 'ns=4;i=321',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'External Meter - Total Active Power.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 296 ---
  {
    id: createId('Meter Reactive Power A'), // Meter specific
    name: 'Meter Reactive Power A',
    nodeId: 'ns=4;i=322',
    dataType: 'Float',
    uiType: 'display',
    icon: Power, // Needs dedicated VAR icon ideally
    unit: 'VAR', // Assumed VAR
    description: 'External Meter - Reactive Power Phase A.',
    category: 'three-phase',
    factor: 1, // Assume raw VAR
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-reactive-power',
    label: ''
  },
  // --- Index 297 ---
  {
    id: createId('Meter Reactive Power B'), // Meter specific
    name: 'Meter Reactive Power B',
    nodeId: 'ns=4;i=323',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VAR',
    description: 'External Meter - Reactive Power Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-reactive-power',
    label: ''
  },
  // --- Index 298 ---
  {
    id: createId('Meter Reactive Power C'), // Meter specific
    name: 'Meter Reactive Power C',
    nodeId: 'ns=4;i=324',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VAR',
    description: 'External Meter - Reactive Power Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-reactive-power',
    label: ''
  },
  // --- Index 299 ---
  {
    id: createId('Meter Reactive Power Total'), // Meter specific
    name: 'Meter Reactive Power Total',
    nodeId: 'ns=4;i=325',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VAR',
    description: 'External Meter - Total Reactive Power.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 300 ---
  {
    id: createId('Meter Apparent Power A'), // Meter specific
    name: 'Meter Apparent Power A',
    nodeId: 'ns=4;i=326',
    dataType: 'Float',
    uiType: 'display',
    icon: Power, // Needs dedicated VA icon ideally
    unit: 'VA', // Assumed VA
    description: 'External Meter - Apparent Power Phase A.',
    category: 'three-phase',
    factor: 1, // Assume raw VA
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-apparent-power',
    label: ''
  },
  // --- Index 301 ---
  {
    id: createId('Meter Apparent Power B'), // Meter specific
    name: 'Meter Apparent Power B',
    nodeId: 'ns=4;i=327',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VA',
    description: 'External Meter - Apparent Power Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-apparent-power',
    label: ''
  },
  // --- Index 302 ---
  {
    id: createId('Meter Apparent Power C'), // Meter specific
    name: 'Meter Apparent Power C',
    nodeId: 'ns=4;i=328',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VA',
    description: 'External Meter - Apparent Power Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-apparent-power',
    label: ''
  },
  // --- Index 303 ---
  {
    id: createId('Meter Apparent Power Total'), // Meter specific
    name: 'Meter Apparent Power Total',
    nodeId: 'ns=4;i=329',
    dataType: 'Float',
    uiType: 'display',
    icon: Power,
    unit: 'VA',
    description: 'External Meter - Total Apparent Power.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 304 ---
  {
    id: createId('Meter Not use 1 i330'),
    name: 'Meter Not use_1 (i=330)',
    nodeId: 'ns=4;i=330',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 1 at ns=4;i=330.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_1" in log.',
    label: ''
  },
  // --- Index 305 ---
  {
    id: createId('Meter Not use 2 i331'),
    name: 'Meter Not use_2 (i=331)',
    nodeId: 'ns=4;i=331',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 2 at ns=4;i=331.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_2" in log.',
    label: ''
  },
  // --- Index 306 ---
  {
    id: createId('Meter Not use 3 i332'),
    name: 'Meter Not use_3 (i=332)',
    nodeId: 'ns=4;i=332',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 3 at ns=4;i=332.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_3" in log.',
    label: ''
  },
  // --- Index 307 ---
  {
    id: createId('Meter Not use 4 i333'),
    name: 'Meter Not use_4 (i=333)',
    nodeId: 'ns=4;i=333',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 4 at ns=4;i=333.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_4" in log.',
    label: ''
  },
  // --- Index 308 ---
  {
    id: createId('Meter Not use 5 i334'),
    name: 'Meter Not use_5 (i=334)',
    nodeId: 'ns=4;i=334',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 5 at ns=4;i=334.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_5" in log.',
    label: ''
  },
  // --- Index 309 ---
  {
    id: createId('Meter Not use 6 i335'),
    name: 'Meter Not use_6 (i=335)',
    nodeId: 'ns=4;i=335',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 6 at ns=4;i=335.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_6" in log.',
    label: ''
  },
  // --- Index 310 ---
  {
    id: createId('Meter Not use 7 i336'),
    name: 'Meter Not use_7 (i=336)',
    nodeId: 'ns=4;i=336',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 7 at ns=4;i=336.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_7" in log.',
    label: ''
  },
  // --- Index 311 ---
  {
    id: createId('Meter Not use 8 i337'),
    name: 'Meter Not use_8 (i=337)',
    nodeId: 'ns=4;i=337',
    dataType: 'Float',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Unused External Meter data point 8 at ns=4;i=337.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked "Not use_8" in log.',
    label: ''
  },
  // --- Index 312 ---
  {
    id: createId('Meter Power Factor A'), // Meter specific
    name: 'Meter Power Factor A',
    nodeId: 'ns=4;i=338',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare, // PF Icon
    unit: '', // Unitless
    description: 'External Meter - Power Factor Phase A.',
    category: 'three-phase',
    factor: 1, // Assume raw PF value (-1 to 1)
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-power-factor',
    label: ''
  },
  // --- Index 313 ---
  {
    id: createId('Meter Power Factor B'), // Meter specific
    name: 'Meter Power Factor B',
    nodeId: 'ns=4;i=339',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Power Factor Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-power-factor',
    label: ''
  },
  // --- Index 314 ---
  {
    id: createId('Meter Power Factor C'), // Meter specific
    name: 'Meter Power Factor C',
    nodeId: 'ns=4;i=340',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Power Factor Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-power-factor',
    label: ''
  },
  // --- Index 315 ---
  {
    id: createId('Meter Power Factor Total'), // Meter specific
    name: 'Meter Power Factor Total',
    nodeId: 'ns=4;i=341',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Total Power Factor.',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 316 ---
  {
    id: createId('Meter Displacement Power Factor A'), // Meter specific
    name: 'Meter Displacement Power Factor A',
    nodeId: 'ns=4;i=342',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Displacement Power Factor (cos φ) Phase A.',
    category: 'three-phase',
    factor: 1,
    phase: 'a',
    isSinglePhase: false,
    threePhaseGroup: 'meter-displacement-pf',
    label: ''
  },
  // --- Index 317 ---
  {
    id: createId('Meter Displacement Power Factor B'), // Meter specific
    name: 'Meter Displacement Power Factor B',
    nodeId: 'ns=4;i=343',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Displacement Power Factor (cos φ) Phase B.',
    category: 'three-phase',
    factor: 1,
    phase: 'b',
    isSinglePhase: false,
    threePhaseGroup: 'meter-displacement-pf',
    label: ''
  },
  // --- Index 318 ---
  {
    id: createId('Meter Displacement Power Factor C'), // Meter specific
    name: 'Meter Displacement Power Factor C',
    nodeId: 'ns=4;i=344',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Displacement Power Factor (cos φ) Phase C.',
    category: 'three-phase',
    factor: 1,
    phase: 'c',
    isSinglePhase: false,
    threePhaseGroup: 'meter-displacement-pf',
    label: ''
  },
  // --- Index 319 ---
  {
    id: createId('Meter Displacement Power Factor Total'), // Meter specific
    name: 'Meter Displacement Power Factor Total',
    nodeId: 'ns=4;i=345',
    dataType: 'Float',
    uiType: 'display',
    icon: SigmaSquare,
    unit: '',
    description: 'External Meter - Total Displacement Power Factor (cos φ).',
    category: 'grid',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 320 ---
  // Note: Index 320 (i=346, Frequency) was already added as an example placeholder in the original code.
  // Ensure it is correctly defined once, matching the details here if needed.
  {
    id: createId('Meter Frequency'), // Meter specific Frequency
    name: 'Meter Frequency',
    nodeId: 'ns=4;i=346',
    dataType: 'Float',
    uiType: 'gauge', // Good candidate for gauge
    icon: AudioWaveform,
    unit: 'Hz',
    min: 49.5, // Example range
    max: 50.5, // Example range
    description: 'External Meter - Measured Frequency.',
    category: 'grid',
    factor: 1, // Float assumed raw Hz
    phase: 'x',
    label: ''
  },
  // --- Index 321 ---
  {
    id: createId('Remote Start Key'),
    name: 'Remote Start Key',
    nodeId: 'ns=4;i=348',
    dataType: 'Boolean',
    uiType: 'button', // Command trigger
    icon: Power, // Start icon
    description: 'Remote command to start operation.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 322 ---
  {
    id: createId('Remote Stop Key'),
    name: 'Remote Stop Key',
    nodeId: 'ns=4;i=349',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Power, // Stop icon
    description: 'Remote command to stop operation.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 323 ---
  {
    id: createId('Remote Test Key'),
    name: 'Remote Test Key',
    nodeId: 'ns=4;i=350',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Activity, // Test icon
    description: 'Remote command to initiate a test sequence.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 324 ---
  // Note: Index 324 (i=351, Remote Auto Key) was already added as an example placeholder.
  // Ensure it is correctly defined once, matching the details here if needed.
  {
    id: createId('Remote Auto Key'),
    name: 'Remote Auto Key',
    nodeId: 'ns=4;i=351',
    dataType: 'Boolean',
    uiType: 'button', // Or switch if it toggles Auto/Manual mode
    icon: Activity, // Placeholder, maybe Settings icon
    description: 'Remote command to enable Auto mode.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Confirm if momentary button or toggle switch. Write-only.',
    label: ''
  },
  // --- Index 325 ---
  {
    id: createId('Remote Manual Key'),
    name: 'Remote Manual Key',
    nodeId: 'ns=4;i=352',
    dataType: 'Boolean',
    uiType: 'button', // Or switch
    icon: Settings, // Manual implies settings/control
    description: 'Remote command to enable Manual mode.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Confirm if momentary button or toggle switch. Write-only.',
    label: ''
  },
  // --- Index 326 ---
  {
    id: createId('Remote Mains C-O Key'),
    name: 'Remote Mains C/O Key', // C/O = Changeover? Circuit Open?
    nodeId: 'ns=4;i=353',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Waypoints, // Represents connection/switching
    description: 'Remote command related to Mains changeover/connection.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Abbreviation C/O needs clarification. Write-only.',
    label: ''
  },
  // --- Index 327 ---
  {
    id: createId('Remote Gen C-O Key'),
    name: 'Remote Gen C/O Key', // C/O = Changeover? Circuit Open?
    nodeId: 'ns=4;i=354',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Waypoints,
    description: 'Remote command related to Generator changeover/connection.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Abbreviation C/O needs clarification. Write-only.',
    label: ''
  },
  // --- Index 328 ---
  {
    id: createId('Remote Up Key'),
    name: 'Remote Up Key',
    nodeId: 'ns=4;i=355',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Activity, // Generic action icon
    description: 'Remote command simulating an "Up" button press (e.g., for menu navigation/adjustment).',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 329 ---
  {
    id: createId('Remote Down Key'),
    name: 'Remote Down Key',
    nodeId: 'ns=4;i=356',
    dataType: 'Boolean',
    uiType: 'button',
    icon: Activity,
    description: 'Remote command simulating a "Down" button press.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 330 ---
  {
    id: createId('Reserved i357'),
    name: 'Reserved (i=357)',
    nodeId: 'ns=4;i=357',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point at ns=4;i=357.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved.',
    label: ''
  },
  // --- Index 331 ---
  {
    id: createId('Reserved 1 i358'),
    name: 'Reserved_1 (i=358)',
    nodeId: 'ns=4;i=358',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 1 at ns=4;i=358.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_1.',
    label: ''
  },
  // --- Index 332 ---
  {
    id: createId('Remote Confirm Key'),
    name: 'Remote Confirm Key',
    nodeId: 'ns=4;i=359',
    dataType: 'Boolean', // Map WORD trigger to Boolean action
    uiType: 'button',
    icon: Activity, // Checkmark icon might be better if available
    description: 'Remote command simulating a "Confirm" or "Enter" button press.',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 333 ---
  {
    id: createId('Remote Mute Key'),
    name: 'Remote Mute Key',
    nodeId: 'ns=4;i=360',
    dataType: 'Boolean', // Map WORD trigger to Boolean action
    uiType: 'button',
    icon: Activity, // Volume Off icon might be better if available
    description: 'Remote command simulating a "Mute" button press (e.g., for alarms).',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 334 ---
  {
    id: createId('Reserved 2 i361'),
    name: 'Reserved_2 (i=361)',
    nodeId: 'ns=4;i=361',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 2 at ns=4;i=361.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_2.',
    label: ''
  },
  // --- Index 335 ---
  {
    id: createId('Reserved 3 i362'),
    name: 'Reserved_3 (i=362)',
    nodeId: 'ns=4;i=362',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 3 at ns=4;i=362.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_3.',
    label: ''
  },
  // --- Index 336 ---
  {
    id: createId('Remote Oil Engine Fast Stop'),
    name: 'Remote Oil Engine Fast Stop',
    nodeId: 'ns=4;i=363',
    dataType: 'Boolean', // Map WORD trigger to Boolean action
    uiType: 'button',
    icon: AlertTriangle, // Emergency stop connotation
    description: 'Remote command for fast stop of an oil engine (Generator?).',
    category: 'control',
    factor: 1,
    phase: 'x',
    notes: 'Write-only command trigger.',
    label: ''
  },
  // --- Index 337 ---
  {
    id: createId('Reserved 4 i364'),
    name: 'Reserved_4 (i=364)',
    nodeId: 'ns=4;i=364',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 4 at ns=4;i=364.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_4.',
    label: ''
  },
  // --- Index 338 ---
  {
    id: createId('Reserved 5 i365'),
    name: 'Reserved_5 (i=365)',
    nodeId: 'ns=4;i=365',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 5 at ns=4;i=365.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_5.',
    label: ''
  },
  // --- Index 339 ---
  {
    id: createId('Reserved 6 i366'),
    name: 'Reserved_6 (i=366)',
    nodeId: 'ns=4;i=366',
    dataType: 'Boolean',
    uiType: 'display',
    icon: HelpCircle,
    description: 'Reserved data point 6 at ns=4;i=366.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Marked Reserved_6.',
    label: ''
  },
  // --- Index 340 ---
  {
    id: createId('Remote Output Port 1 Output'),
    name: 'Remote Output Port 1 Output',
    nodeId: 'ns=4;i=367',
    dataType: 'Int16', // Map WORD to Int16 for status value (e.g., 0/1)
    uiType: 'display',
    icon: FileOutput, // Represents an output port status
    description: 'Status or value of remote output port 1.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'May represent boolean state (0/1) or an analog value.',
    label: ''
  },
  // --- Index 341 ---
  {
    id: createId('Remote Output Port 2 Output'),
    name: 'Remote Output Port 2 Output',
    nodeId: 'ns=4;i=368',
    dataType: 'Int16',
    uiType: 'display',
    icon: FileOutput,
    description: 'Status or value of remote output port 2.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 342 ---
  {
    id: createId('Remote Output Port 3 Output'),
    name: 'Remote Output Port 3 Output',
    nodeId: 'ns=4;i=369',
    dataType: 'Int16',
    uiType: 'display',
    icon: FileOutput,
    description: 'Status or value of remote output port 3.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 343 ---
  {
    id: createId('Remote Output Port 4 Output'),
    name: 'Remote Output Port 4 Output',
    nodeId: 'ns=4;i=370',
    dataType: 'Int16',
    uiType: 'display',
    icon: FileOutput,
    description: 'Status or value of remote output port 4.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 344 ---
  {
    id: createId('Remote Output Port 5 Output'),
    name: 'Remote Output Port 5 Output',
    nodeId: 'ns=4;i=371',
    dataType: 'Int16',
    uiType: 'display',
    icon: FileOutput,
    description: 'Status or value of remote output port 5.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 345 ---
  {
    id: createId('Remote Output Port 6 Output'),
    name: 'Remote Output Port 6 Output',
    nodeId: 'ns=4;i=372',
    dataType: 'Int16',
    uiType: 'display',
    icon: FileOutput,
    description: 'Status or value of remote output port 6.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 346 ---
  {
    id: createId('Meter RTC Year'), // Meter specific RTC
    name: 'Meter RTC Year',
    nodeId: 'ns=4;i=374',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Year.',
    category: 'status',
    factor: 1, // Raw value
    phase: 'x',
    notes: 'Part of meter date/time. May need assembly/decoding.',
    label: ''
  },
  // --- Index 347 ---
  {
    id: createId('Meter RTC Month'), // Meter specific RTC
    name: 'Meter RTC Month',
    nodeId: 'ns=4;i=375',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Month.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 348 ---
  {
    id: createId('Meter RTC Day'), // Meter specific RTC
    name: 'Meter RTC Day',
    nodeId: 'ns=4;i=376',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Day.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 349 ---
  {
    id: createId('Meter RTC Hour'), // Meter specific RTC
    name: 'Meter RTC Hour',
    nodeId: 'ns=4;i=377',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Hour.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 350 ---
  {
    id: createId('Meter RTC Minute'), // Meter specific RTC
    name: 'Meter RTC Minute',
    nodeId: 'ns=4;i=378',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Minute.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 351 ---
  {
    id: createId('Meter RTC Second'), // Meter specific RTC
    name: 'Meter RTC Second',
    nodeId: 'ns=4;i=379',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Second.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 352 ---
  {
    id: createId('Meter RTC Millisecond'), // Meter specific RTC
    name: 'Meter RTC Millisecond',
    nodeId: 'ns=4;i=380',
    dataType: 'Int16', // Map SByte to Int16
    uiType: 'display',
    icon: Clock,
    description: 'External Meter Real-Time Clock - Millisecond.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 353 ---
  {
    id: createId('Meter Active Load Timer'), // Meter specific status
    name: 'Meter Active Load Timer',
    nodeId: 'ns=4;i=382',
    dataType: 'Boolean',
    uiType: 'display', // Status indicator
    icon: Info, // Or Clock
    description: 'External Meter - Status of the Active Load Timer.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 354 ---
  {
    id: createId('Meter Operation Timer 1'), // Meter specific status
    name: 'Meter Operation Timer 1 Status',
    nodeId: 'ns=4;i=383',
    dataType: 'Boolean',
    uiType: 'display',
    icon: Info, // Or Clock
    description: 'External Meter - Status of Operation Timer 1.',
    category: 'status',
    factor: 1,
    phase: 'x',
    notes: 'Purpose of "_1" unclear.',
    label: ''
  },
  // --- Index 355 ---
  {
    id: createId('Meter Cycle Count Status'), // Meter specific status
    name: 'Meter Cycle Count Status',
    nodeId: 'ns=4;i=384',
    dataType: 'Boolean',
    uiType: 'display',
    icon: Info, // Or Sigma for counter
    description: 'External Meter - Status related to cycle counting.',
    category: 'status',
    factor: 1,
    phase: 'x',
    label: ''
  },
  // --- Index 356 ---
  {
    id: createId('Meter Active Energy Delivered'), // Meter Energy
    name: 'Meter Active Energy Delivered',
    nodeId: 'ns=4;i=386',
    dataType: 'Int16', // Data type from log, seems small for energy total
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed unit
    description: 'External Meter - Active Energy Delivered (Import/Into Load).',
    category: 'energy',
    factor: 1, // Assume raw Wh, verify scaling
    phase: 'x',
    notes: 'Unit (Wh) and factor (1) assumed. Int16 seems small, may need combining or larger type.',
    label: ''
  },
  // --- Index 357 ---
  {
    id: createId('Meter Active Energy Received'), // Meter Energy
    name: 'Meter Active Energy Received',
    nodeId: 'ns=4;i=387',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed unit
    description: 'External Meter - Active Energy Received (Export/Out of Load).',
    category: 'energy',
    factor: 1, // Assume raw Wh from Float
    phase: 'x',
    notes: 'Unit (Wh) assumed.',
    label: ''
  },
  // --- Index 358 ---
  {
    id: createId('Meter Active Energy Delivered plus Received'), // Meter Energy
    name: 'Meter Active Energy Delivered + Received',
    nodeId: 'ns=4;i=388',
    dataType: 'Int16', // Map WORD to Int16
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Total Active Energy (Delivered + Received).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Unit (Wh) and factor (1) assumed. Int16 seems small.',
    label: ''
  },
  // --- Index 359 ---
  {
    id: createId('Meter Active Energy Delivered minus Received'), // Meter Energy
    name: 'Meter Active Energy Delivered - Received',
    nodeId: 'ns=4;i=389',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Net Active Energy (Delivered - Received).',
    category: 'energy',
    factor: 1, // Assume raw Wh from Float
    phase: 'x',
    notes: 'Unit (Wh) assumed.',
    label: ''
  },
  // --- Index 360 ---
  {
    id: createId('Meter Reactive Energy Delivered'), // Meter Energy
    name: 'Meter Reactive Energy Delivered',
    nodeId: 'ns=4;i=390',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed unit
    description: 'External Meter - Reactive Energy Delivered.',
    category: 'energy',
    factor: 1, // Assume raw VARh from Float
    phase: 'x',
    notes: 'Unit (VARh) assumed.',
    label: ''
  },
  // --- Index 361 ---
  {
    id: createId('Meter Reactive Energy Received'), // Meter Energy
    name: 'Meter Reactive Energy Received',
    nodeId: 'ns=4;i=391',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Reactive Energy Received.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VARh) assumed.',
    label: ''
  },
  // --- Index 362 ---
  {
    id: createId('Meter Reactive Energy Delivered plus Received'), // Meter Energy
    name: 'Meter Reactive Energy Delivered + Received',
    nodeId: 'ns=4;i=392',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Total Reactive Energy (Delivered + Received).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VARh) assumed.',
    label: ''
  },
  // --- Index 363 ---
  {
    id: createId('Meter Reactive Energy Delivered minus Received'), // Meter Energy
    name: 'Meter Reactive Energy Delivered - Received',
    nodeId: 'ns=4;i=393',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Net Reactive Energy (Delivered - Received).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VARh) assumed.',
    label: ''
  },
  // --- Index 364 ---
  {
    id: createId('Meter Apparent Energy Delivered'), // Meter Energy
    name: 'Meter Apparent Energy Delivered',
    nodeId: 'ns=4;i=394',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed unit
    description: 'External Meter - Apparent Energy Delivered.',
    category: 'energy',
    factor: 1, // Assume raw VAh from Float
    phase: 'x',
    notes: 'Unit (VAh) assumed.',
    label: ''
  },
  // --- Index 365 ---
  {
    id: createId('Meter Apparent Energy Received'), // Meter Energy
    name: 'Meter Apparent Energy Received',
    nodeId: 'ns=4;i=395',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Apparent Energy Received.',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VAh) assumed.',
    label: ''
  },
  // --- Index 366 ---
  {
    id: createId('Meter Apparent Energy Delivered plus Received'), // Meter Energy
    name: 'Meter Apparent Energy Delivered + Received',
    nodeId: 'ns=4;i=396',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Total Apparent Energy (Delivered + Received).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VAh) assumed.',
    label: ''
  },
  // --- Index 367 ---
  {
    id: createId('Meter Apparent Energy Delivered minus Received'), // Meter Energy
    name: 'Meter Apparent Energy Delivered - Received',
    nodeId: 'ns=4;i=397',
    dataType: 'Float',
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Net Apparent Energy (Delivered - Received).',
    category: 'energy',
    factor: 1,
    phase: 'x',
    notes: 'Unit (VAh) assumed.',
    label: ''
  },
  // --- Index 368 ---
  {
    id: createId('Meter Accumulated Energy Reset Date Time'), // Meter Status
    name: 'Meter Accumulated Energy Reset Date/Time',
    nodeId: 'ns=4;i=399',
    dataType: 'String', // Map DATE to String for display
    uiType: 'display',
    icon: Clock,
    description: 'External Meter - Date and Time of last accumulated energy reset.',
    category: 'status',
    factor: 1, // N/A
    phase: 'x',
    notes: 'Data type DATE mapped to String. Format needs handling.',
    label: ''
  },
  // --- Index 369 ---
  {
    id: createId('Meter Active Energy Delivered Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Active Energy Delivered (Alt)',
    nodeId: 'ns=4;i=400',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Active Energy Delivered (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Duplicate name from i=386, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 370 ---
  {
    id: createId('Meter Active Energy Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Active Energy Received (Alt)',
    nodeId: 'ns=4;i=401',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Active Energy Received (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Duplicate name from i=387, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 371 ---
  {
    id: createId('Meter Active Energy Delivered plus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Active Energy Delivered + Received (Alt)',
    nodeId: 'ns=4;i=402',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Total Active Energy (Delivered + Received) (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Duplicate name from i=388, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 372 ---
  {
    id: createId('Meter Active Energy Delivered minus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Active Energy Delivered - Received (Alt?)', // Name was identical to i=402 in log, assume Net
    nodeId: 'ns=4;i=403',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'Wh', // Assumed
    description: 'External Meter - Net Active Energy (Delivered - Received) (Alternative Register?).',
    category: 'energy',
    factor: 1, // Assume raw Wh
    phase: 'x',
    notes: 'Name in log "Delivered + Received_1" was confusing, assumed Net like i=389. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 373 ---
  {
    id: createId('Meter Reactive Energy Delivered Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Reactive Energy Delivered (Alt)',
    nodeId: 'ns=4;i=404',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Reactive Energy Delivered (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VARh
    phase: 'x',
    notes: 'Duplicate name from i=390, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 374 ---
  {
    id: createId('Meter Reactive Energy Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Reactive Energy Received (Alt)',
    nodeId: 'ns=4;i=405',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Reactive Energy Received (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VARh
    phase: 'x',
    notes: 'Duplicate name from i=391, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 375 ---
  {
    id: createId('Meter Reactive Energy Delivered plus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Reactive Energy Delivered + Received (Alt)',
    nodeId: 'ns=4;i=406',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Total Reactive Energy (Delivered + Received) (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VARh
    phase: 'x',
    notes: 'Duplicate name from i=392, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 376 ---
  {
    id: createId('Meter Reactive Energy Delivered minus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Reactive Energy Delivered - Received (Alt)',
    nodeId: 'ns=4;i=407',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VARh', // Assumed
    description: 'External Meter - Net Reactive Energy (Delivered - Received) (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VARh
    phase: 'x',
    notes: 'Duplicate name from i=393, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 377 ---
  {
    id: createId('Meter Apparent Energy Delivered Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Apparent Energy Delivered (Alt)',
    nodeId: 'ns=4;i=408',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Apparent Energy Delivered (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VAh
    phase: 'x',
    notes: 'Duplicate name from i=394, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 378 ---
  {
    id: createId('Meter Apparent Energy Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Apparent Energy Received (Alt)',
    nodeId: 'ns=4;i=409',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Apparent Energy Received (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VAh
    phase: 'x',
    notes: 'Duplicate name from i=395, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 379 ---
  {
    id: createId('Meter Apparent Energy Delivered plus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Apparent Energy Delivered + Received (Alt)',
    nodeId: 'ns=4;i=410',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Total Apparent Energy (Delivered + Received) (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VAh
    phase: 'x',
    notes: 'Duplicate name from i=396, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 380 ---
  {
    id: createId('Meter Apparent Energy Delivered minus Received Alt'), // Meter Energy (Alternative register?)
    name: 'Meter Apparent Energy Delivered - Received (Alt)',
    nodeId: 'ns=4;i=411',
    dataType: 'Int16', // Log type
    uiType: 'display',
    icon: Sigma,
    unit: 'VAh', // Assumed
    description: 'External Meter - Net Apparent Energy (Delivered - Received) (Alternative Register).',
    category: 'energy',
    factor: 1, // Assume raw VAh
    phase: 'x',
    notes: 'Duplicate name from i=397, different NodeId/Type. Marked Alt. Int16 small.',
    label: ''
  },
  // --- Index 381 ---
  {
    id: createId('Meter Last Demand'), // Meter Demand
    name: 'Meter Last Demand',
    nodeId: 'ns=4;i=413',
    dataType: 'Float', // Assuming Float for Power Demand, override Boolean from log
    uiType: 'display',
    icon: Gauge, // Demand is often shown as a gauge/peak value
    unit: 'W', // Assumed unit for demand (Power)
    description: 'External Meter - Last Demand Period Value.',
    category: 'energy', // Demand relates to energy/power usage
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Log listed Boolean, changed to Float for Power. Unit (W) assumed.',
    label: ''
  },
  // --- Index 382 ---
  {
    id: createId('Meter Present Demand'), // Meter Demand
    name: 'Meter Present Demand',
    nodeId: 'ns=4;i=414',
    dataType: 'Float', // Assuming Float for Power Demand
    uiType: 'display',
    icon: Gauge,
    unit: 'W', // Assumed
    description: 'External Meter - Present Demand Period Value.',
    category: 'energy',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Log listed Boolean, changed to Float for Power. Unit (W) assumed.',
    label: ''
  },
  // --- Index 383 ---
  {
    id: createId('Meter Predicted Demand'), // Meter Demand
    name: 'Meter Predicted Demand',
    nodeId: 'ns=4;i=415',
    dataType: 'Float', // Assuming Float for Power Demand
    uiType: 'display',
    icon: Gauge,
    unit: 'W', // Assumed
    description: 'External Meter - Predicted Demand for Current Period.',
    category: 'energy',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Log listed Boolean, changed to Float for Power. Unit (W) assumed.',
    label: ''
  },
  // --- Index 384 ---
  {
    id: createId('Meter Peak Demand'), // Meter Demand
    name: 'Meter Peak Demand',
    nodeId: 'ns=4;i=416',
    dataType: 'Float', // Assuming Float for Power Demand
    uiType: 'display',
    icon: Gauge,
    unit: 'W', // Assumed
    description: 'External Meter - Peak Demand Recorded.',
    category: 'energy',
    factor: 1, // Assume raw Watts
    phase: 'x',
    notes: 'Log listed Boolean, changed to Float for Power. Unit (W) assumed.',
    label: ''
  },
];

// Generate nodeIds list for convenience
export const nodeIds = dataPoints.map(dataPoint => dataPoint.nodeId);

// Function to potentially combine High/Low words client-side (Example)
function combineWords(high: number, low: number): number {
   // Assuming low word is unsigned 16-bit, high word is signed/unsigned depending on context
   // This is complex and depends heavily on server implementation (endianness, signedness)
   // Example for unsigned 32-bit:
   const lowUnsigned = low & 0xFFFF;
   const highUnsigned = high & 0xFFFF;
   return (highUnsigned << 16) | lowUnsigned;
   // For signed, it's more complex. Best handled server-side if possible.
}
