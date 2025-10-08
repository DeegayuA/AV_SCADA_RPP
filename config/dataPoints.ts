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
  // --- START OF GENERATED DATA POINTS ---
  // Data sourced from registerMap16Bit, with nodeIds generated sequentially from ns=2;i=0

  // Batch 1: Grid & Time Settings
  {
    id: createId('Power On Voltage'),
    name: 'Power On Voltage',
    nodeId: 'ns=2;i=0',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Zap,
    unit: 'V',
    description: 'Minimum voltage required for inverter to power on.',
    category: 'settings',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Power On Voltage',
  },
  {
    id: createId('Reconnect Time'),
    name: 'Reconnect Time',
    nodeId: 'ns=2;i=1',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Clock,
    unit: 's',
    description: 'Time delay before inverter attempts to reconnect to the grid.',
    category: 'settings',
    isWritable: true,
    label: 'Reconnect Time',
  },
  {
    id: createId('Lower Limit of Grid Voltage'),
    name: 'Lower Limit of Grid Voltage',
    nodeId: 'ns=2;i=2',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Minimize2,
    unit: 'V',
    description: 'Lower voltage limit for grid connection.',
    category: 'settings',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Grid Voltage Lower Limit',
  },
  {
    id: createId('Upper Limit of Grid Voltage'),
    name: 'Upper Limit of Grid Voltage',
    nodeId: 'ns=2;i=3',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Maximize2,
    unit: 'V',
    description: 'Upper voltage limit for grid connection.',
    category: 'settings',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Grid Voltage Upper Limit',
  },
  {
    id: createId('Lower Limit of Grid Frequency'),
    name: 'Lower Limit of Grid Frequency',
    nodeId: 'ns=2;i=4',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Waves,
    unit: 'Hz',
    description: 'Lower frequency limit for grid connection.',
    category: 'settings',
    factor: 0.01,
    isWritable: true,
    decimalPlaces: 2,
    label: 'Grid Frequency Lower Limit',
  },
  {
    id: createId('Upper Limit of Grid Frequency'),
    name: 'Upper Limit of Grid Frequency',
    nodeId: 'ns=2;i=5',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Waves,
    unit: 'Hz',
    description: 'Upper frequency limit for grid connection.',
    category: 'settings',
    factor: 0.01,
    isWritable: true,
    decimalPlaces: 2,
    label: 'Grid Frequency Upper Limit',
  },
  {
    id: createId('Device RTC Time Year Month'),
    name: 'Device RTC Time Year Month',
    nodeId: 'ns=2;i=6',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    description: "The inverter's internal clock reading for Year and Month.",
    category: 'status',
    notes: 'Raw value requires decoding to extract Year and Month.',
    label: 'Device Time (Year/Month)',
  },
  {
    id: createId('Device RTC Time Day Hour'),
    name: 'Device RTC Time Day Hour',
    nodeId: 'ns=2;i=7',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    description: "The inverter's internal clock reading for Day and Hour.",
    category: 'status',
    notes: 'Raw value requires decoding to extract Day and Hour.',
    label: 'Device Time (Day/Hour)',
  },
  {
    id: createId('Device RTC Time Minute Second'),
    name: 'Device RTC Time Minute Second',
    nodeId: 'ns=2;i=8',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    description: "The inverter's internal clock reading for Minute and Second.",
    category: 'status',
    notes: 'Raw value requires decoding to extract Minute and Second.',
    label: 'Device Time (Min/Sec)',
  },

  // Batch 2: Power & Safety Adjustments
  {
    id: createId('Active Power Adjust'),
    name: 'Active Power Adjust',
    nodeId: 'ns=2;i=9',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Percent,
    unit: '%',
    description: 'Adjust the active power output percentage.',
    category: 'control',
    isWritable: true,
    label: 'Active Power Adjust',
  },
  {
    id: createId('PF Reactive Power Adjust'),
    name: 'PF Reactive Power Adjust',
    nodeId: 'ns=2;i=10',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Percent,
    unit: '%',
    description: 'Adjust the Power Factor reactive power percentage.',
    category: 'control',
    isWritable: true,
    label: 'PF Reactive Power Adjust',
  },
  {
    id: createId('Reactive Power Adjust'),
    name: 'Reactive Power Adjust',
    nodeId: 'ns=2;i=11',
    dataType: 'Int32', // This register is 32-bit as per the provided data
    uiType: 'input',
    icon: SigmaSquare,
    unit: 'Var',
    description: 'Adjust the reactive power output value.',
    category: 'control',
    isWritable: true,
    notes: 'This is a 32-bit value and likely occupies two consecutive 16-bit registers.',
    label: 'Reactive Power Adjust',
  },
  {
    id: createId('Export Power Limit Adjust Range'),
    name: 'Export Power Limit Adjust Range',
    nodeId: 'ns=2;i=12',
    dataType: 'Int16',
    uiType: 'input',
    icon: Percent,
    unit: '%',
    description: 'Set the adjustment range for the export power limit.',
    category: 'control',
    isWritable: true,
    label: 'Export Limit Adjust Range',
  },
  {
    id: createId('Taiwan Safety VP Set'),
    name: 'Taiwan Safety VP Set',
    nodeId: 'ns=2;i=13',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Settings,
    unit: 'V',
    description: 'Voltage protection setting for Taiwan safety standards.',
    category: 'settings',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Taiwan Safety Voltage',
  },
  {
    id: createId('Taiwan Safety PF Adjust'),
    name: 'Taiwan Safety PF Adjust',
    nodeId: 'ns=2;i=14',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Settings,
    unit: '%',
    description: 'Power Factor adjustment for Taiwan safety standards.',
    category: 'settings',
    factor: 0.01, // Stated as 100 in source
    isWritable: true,
    decimalPlaces: 2,
    label: 'Taiwan Safety PF Adjust',
  },
  {
    id: createId('Taiwan Safety Reactive Power Adjust'),
    name: 'Taiwan Safety Reactive Power Adjust',
    nodeId: 'ns=2;i=15',
    dataType: 'Int16',
    uiType: 'input',
    icon: Settings,
    unit: '%',
    description: 'Reactive power adjustment for Taiwan safety standards.',
    category: 'settings',
    isWritable: true,
    label: 'Taiwan Safety Reactive Power',
  },
  {
    id: createId('Taiwan Safety Active Power Adjust'),
    name: 'Taiwan Safety Active Power Adjust',
    nodeId: 'ns=2;i=16',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Settings,
    unit: '%',
    description: 'Active power adjustment for Taiwan safety standards.',
    category: 'settings',
    isWritable: true,
    label: 'Taiwan Safety Active Power',
  },
  {
    id: createId('Export Power Limit Communication Overtime Set'),
    name: 'Export Power Limit Communication Overtime Set',
    nodeId: 'ns=2;i=17',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Clock,
    unit: 's',
    description: 'Communication timeout for the export power limit function.',
    category: 'settings',
    isWritable: true,
    label: 'Export Limit Comm Timeout',
  },
  {
    id: createId('Taiwan VPC Curve Switch'),
    name: 'Taiwan VPC Curve Switch',
    nodeId: 'ns=2;i=18',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Enable or disable the Taiwan VPC (Volt-Var) curve.',
    category: 'control',
    isWritable: true,
    label: 'Taiwan VPC Curve Switch',
  },

  // Batch 3: Commands & Control Switches
  {
    id: createId('Power On Allow On-Grid Self-Test'),
    name: 'Power On Allow On-Grid Self-Test',
    nodeId: 'ns=2;i=19',
    dataType: 'UInt16',
    uiType: 'button',
    icon: Power,
    description: 'Command to power on the inverter and allow on-grid self-test.',
    category: 'control',
    isWritable: true,
    label: 'Power On (Allow Self-Test)',
  },
  {
    id: createId('Power Off Not Allow On-Grid Self-Test'),
    name: 'Power Off Not Allow On-Grid Self-Test',
    nodeId: 'ns=2;i=20',
    dataType: 'UInt16',
    uiType: 'button',
    icon: Power,
    description: 'Command to power off the inverter and disallow self-test.',
    category: 'control',
    isWritable: true,
    label: 'Power Off',
  },
  {
    id: createId('Restart'),
    name: 'Restart',
    nodeId: 'ns=2;i=21',
    dataType: 'UInt16',
    uiType: 'button',
    icon: Power,
    description: 'Command to restart the inverter.',
    category: 'control',
    isWritable: true,
    label: 'Restart Inverter',
  },
  {
    id: createId('On-Grid Export Power Limit Switch'),
    name: 'On-Grid Export Power Limit Switch',
    nodeId: 'ns=2;i=22',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: FileOutput,
    description: 'Enables or disables the on-grid export power limitation.',
    category: 'control',
    isWritable: true,
    label: 'Export Power Limit Switch',
  },
  {
    id: createId('Set The Export Power Percentage Need To Turn On Limit Switch'),
    name: 'Set The Export Power Percentage Need To Turn On Limit Switch',
    nodeId: 'ns=2;i=23',
    dataType: 'UInt16',
    uiType: 'input',
    icon: FileOutput,
    unit: '%',
    description: 'Sets export power percentage. Requires the limit switch to be ON.',
    category: 'control',
    isWritable: true,
    label: 'Export Power % (Requires Switch)',
  },
  {
    id: createId('Set The Export Power Percentage No Need To Turn On Limit Switch'),
    name: 'Set The Export Power Percentage No Need To Turn On Limit Switch',
    nodeId: 'ns=2;i=24',
    dataType: 'UInt16',
    uiType: 'input',
    icon: FileOutput,
    unit: '%',
    description: 'Sets export power percentage directly, overriding the switch.',
    category: 'control',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Export Power % (Direct)',
  },
  {
    id: createId('Automatic Reactive Power Adjust'),
    name: 'Automatic Reactive Power Adjust',
    nodeId: 'ns=2;i=25',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Enable or disable automatic reactive power adjustment.',
    category: 'control',
    isWritable: true,
    label: 'Auto Reactive Power Adjust',
  },
  {
    id: createId('Battery Mode Switch Brazil'),
    name: 'Battery Mode Switch Brazil',
    nodeId: 'ns=2;i=26',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: Battery,
    description: 'Switches battery mode for Brazil-specific compliance.',
    category: 'control',
    isWritable: true,
    label: 'Battery Mode (Brazil)',
  },
  {
    id: createId('Battery Voltage Set Brazil'),
    name: 'Battery Voltage Set Brazil',
    nodeId: 'ns=2;i=27',
    dataType: 'UInt16',
    uiType: 'input',
    icon: Battery,
    unit: 'V',
    description: 'Sets the battery voltage for Brazil-specific compliance.',
    category: 'control',
    factor: 0.1,
    isWritable: true,
    decimalPlaces: 1,
    label: 'Battery Voltage (Brazil)',
  },
  {
    id: createId('Shadow Mode Switch'),
    name: 'Shadow Mode Switch',
    nodeId: 'ns=2;i=28',
    dataType: 'UInt16',
    uiType: 'switch',
    icon: ToggleRight,
    description: 'Enable or disable shadow optimization mode.',
    category: 'control',
    isWritable: true,
    label: 'Shadow Mode Switch',
  },

  // Batch 4: Energy & Operational Data
  {
    id: createId('High Byte of Total Feed Power To Grid'),
    name: 'High Byte of Total Feed Power To Grid',
    nodeId: 'ns=2;i=29',
    dataType: 'UInt16',
    uiType: 'display',
    icon: FileOutput,
    unit: 'kWh',
    description: 'High word of the total energy fed to the grid.',
    category: 'energy',
    factor: 0.1,
    notes: 'Combine with low byte for the complete 32-bit value.',
    label: 'Total Export (High Word)',
  },
  {
    id: createId('Low Byte of Total Feed Power To Grid'),
    name: 'Low Byte of Total Feed Power To Grid',
    nodeId: 'ns=2;i=30',
    dataType: 'UInt16',
    uiType: 'display',
    icon: FileOutput,
    unit: 'kWh',
    description: 'Low word of the total energy fed to the grid.',
    category: 'energy',
    factor: 0.1,
    notes: 'Combine with high byte for the complete 32-bit value.',
    label: 'Total Export (Low Word)',
  },
  {
    id: createId('High Byte of Total Feeding Hours'),
    name: 'High Byte of Total Feeding Hours',
    nodeId: 'ns=2;i=31',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    unit: 'hr',
    description: 'High word of the total operational hours.',
    category: 'energy',
    notes: 'Combine with low byte for the complete 32-bit value.',
    label: 'Total Hours (High Word)',
  },
  {
    id: createId('Low Byte of Total Feeding Hours'),
    name: 'Low Byte of Total Feeding Hours',
    nodeId: 'ns=2;i=32',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    unit: 'hr',
    description: 'Low word of the total operational hours.',
    category: 'energy',
    notes: 'Combine with high byte for the complete 32-bit value.',
    label: 'Total Hours (Low Word)',
  },

  // Batch 5: PV & Grid Measurements
  {
    id: createId('VPV1 PV1 Input Voltage'),
    name: 'VPV1 PV1 Input Voltage',
    nodeId: 'ns=2;i=33',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 1.',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV1 Voltage',
  },
  {
    id: createId('VPV2 PV2 Input Voltage'),
    name: 'VPV2 PV2 Input Voltage',
    nodeId: 'ns=2;i=34',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 2.',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV2 Voltage',
  },
  {
    id: createId('IPV1 PV1 Input Current'),
    name: 'IPV1 PV1 Input Current',
    nodeId: 'ns=2;i=35',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 1.',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV1 Current',
  },
  {
    id: createId('IPV2 PV2 Input Current'),
    name: 'IPV2 PV2 Input Current',
    nodeId: 'ns=2;i=36',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 2.',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV2 Current',
  },
  {
    id: createId('VAC1 L1 Phase Voltage'),
    name: 'VAC1 L1 Phase Voltage',
    nodeId: 'ns=2;i=37',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L1 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'a',
    decimalPlaces: 1,
    label: 'L1 Voltage',
  },
  {
    id: createId('VAC2 L2 Phase Voltage'),
    name: 'VAC2 L2 Phase Voltage',
    nodeId: 'ns=2;i=38',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L2 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'b',
    decimalPlaces: 1,
    label: 'L2 Voltage',
  },
  {
    id: createId('VAC3 L3 Phase Voltage'),
    name: 'VAC3 L3 Phase Voltage',
    nodeId: 'ns=2;i=39',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L3 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'c',
    decimalPlaces: 1,
    label: 'L3 Voltage',
  },
  {
    id: createId('IAC1 L1 Phase Current'),
    name: 'IAC1 L1 Phase Current',
    nodeId: 'ns=2;i=40',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Grid current of L1 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'a',
    decimalPlaces: 1,
    label: 'L1 Current',
  },
  {
    id: createId('IAC3 L3 Phase Current'),
    name: 'IAC3 L3 Phase Current',
    nodeId: 'ns=2;i=41',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Grid current of L3 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'c',
    decimalPlaces: 1,
    label: 'L3 Current',
  },
  {
    id: createId('FAC1 L1 Phase Frequency'),
    name: 'FAC1 L1 Phase Frequency',
    nodeId: 'ns=2;i=42',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L1 Phase.',
    category: 'grid',
    factor: 0.01,
    phase: 'a',
    decimalPlaces: 2,
    label: 'L1 Frequency',
  },
  {
    id: createId('FAC2 L2 Phase Frequency'),
    name: 'FAC2 L2 Phase Frequency',
    nodeId: 'ns=2;i=43',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L2 Phase.',
    category: 'grid',
    factor: 0.01,
    phase: 'b',
    decimalPlaces: 2,
    label: 'L2 Frequency',
  },
  {
    id: createId('FAC3 L3 Phase Frequency'),
    name: 'FAC3 L3 Phase Frequency',
    nodeId: 'ns=2;i=44',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L3 Phase.',
    category: 'grid',
    factor: 0.01,
    phase: 'c',
    decimalPlaces: 2,
    label: 'L3 Frequency',
  },

  // Batch 6: Inverter Status & Internal Data
  {
    id: createId('PACL Inverter Current Output Power'),
    name: 'PACL Inverter Current Output Power',
    nodeId: 'ns=2;i=45',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Current active power output of the inverter.',
    category: 'inverter',
    label: 'Output Power',
  },
  {
    id: createId('Work Mode'),
    name: 'Work Mode',
    nodeId: 'ns=2;i=46',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Info,
    description: "Current operational mode of the inverter. (e.g., 0: Wait, 1: Normal, 2: Fault)",
    category: 'status',
    label: 'Work Mode',
  },
  {
    id: createId('Inverter Internal Temperature'),
    name: 'Inverter Internal Temperature',
    nodeId: 'ns=2;i=47',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Thermometer,
    unit: '°C',
    description: 'Internal temperature of the inverter.',
    category: 'inverter',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'Internal Temperature',
  },
  {
    id: createId('E-Day Daily Power Generation'),
    name: 'E-Day Daily Power Generation',
    nodeId: 'ns=2;i=48',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Power,
    unit: 'kWh',
    description: 'Total energy generated today.',
    category: 'energy',
    factor: 0.1,
    decimalPlaces: 1,
    label: "Today's Generation",
  },

  // Batch 7: Duplicated/Alternative Data Registers (Marked with 'Alt')
  {
    id: createId('VPV1 PV1 Input Voltage Alt'),
    name: 'VPV1 PV1 Input Voltage Alt',
    nodeId: 'ns=2;i=49',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 1 (alternative address).',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV1 Voltage (Alt)',
  },
  {
    id: createId('VPV2 PV2 Input Voltage Alt'),
    name: 'VPV2 PV2 Input Voltage Alt',
    nodeId: 'ns=2;i=50',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Input voltage from PV string 2 (alternative address).',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV2 Voltage (Alt)',
  },
  {
    id: createId('IPV1 PV1 Input Current Alt'),
    name: 'IPV1 PV1 Input Current Alt',
    nodeId: 'ns=2;i=51',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 1 (alternative address).',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV1 Current (Alt)',
  },
  {
    id: createId('IPV2 PV2 Input Current Alt'),
    name: 'IPV2 PV2 Input Current Alt',
    nodeId: 'ns=2;i=52',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Input current from PV string 2 (alternative address).',
    category: 'pv',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'PV2 Current (Alt)',
  },
  {
    id: createId('VAC1 L1 Phase Voltage Alt'),
    name: 'VAC1 L1 Phase Voltage Alt',
    nodeId: 'ns=2;i=53',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L1 Phase (alternative address).',
    category: 'grid',
    factor: 0.1,
    phase: 'a',
    decimalPlaces: 1,
    label: 'L1 Voltage (Alt)',
  },
  {
    id: createId('VAC2 L2 Phase Voltage Alt'),
    name: 'VAC2 L2 Phase Voltage Alt',
    nodeId: 'ns=2;i=54',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L2 Phase (alternative address).',
    category: 'grid',
    factor: 0.1,
    phase: 'b',
    decimalPlaces: 1,
    label: 'L2 Voltage (Alt)',
  },
  {
    id: createId('VAC3 L3 Phase Voltage Alt'),
    name: 'VAC3 L3 Phase Voltage Alt',
    nodeId: 'ns=2;i=55',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Grid voltage of L3 Phase (alternative address).',
    category: 'grid',
    factor: 0.1,
    phase: 'c',
    decimalPlaces: 1,
    label: 'L3 Voltage (Alt)',
  },
  {
    id: createId('IAC1 L1 Phase Current Alt'),
    name: 'IAC1 L1 Phase Current Alt',
    nodeId: 'ns=2;i=56',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Grid current of L1 Phase (alternative address).',
    category: 'grid',
    factor: 0.1,
    phase: 'a',
    decimalPlaces: 1,
    label: 'L1 Current (Alt)',
  },
  {
    id: createId('IAC2 L2 Phase Current'),
    name: 'IAC2 L2 Phase Current',
    nodeId: 'ns=2;i=57',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Grid current of L2 Phase.',
    category: 'grid',
    factor: 0.1,
    phase: 'b',
    decimalPlaces: 1,
    label: 'L2 Current',
  },
  {
    id: createId('IAC3 L3 Phase Current Alt'),
    name: 'IAC3 L3 Phase Current Alt',
    nodeId: 'ns=2;i=58',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'A',
    description: 'Grid current of L3 Phase (alternative address).',
    category: 'grid',
    factor: 0.1,
    phase: 'c',
    decimalPlaces: 1,
    label: 'L3 Current (Alt)',
  },
  {
    id: createId('FAC1 L1 Phase Frequency Alt'),
    name: 'FAC1 L1 Phase Frequency Alt',
    nodeId: 'ns=2;i=59',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L1 Phase (alternative address).',
    category: 'grid',
    factor: 0.01,
    phase: 'a',
    decimalPlaces: 2,
    label: 'L1 Frequency (Alt)',
  },
  {
    id: createId('FAC2 L2 Phase Frequency Alt'),
    name: 'FAC2 L2 Phase Frequency Alt',
    nodeId: 'ns=2;i=60',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L2 Phase (alternative address).',
    category: 'grid',
    factor: 0.01,
    phase: 'b',
    decimalPlaces: 2,
    label: 'L2 Frequency (Alt)',
  },
  {
    id: createId('FAC3 L3 Phase Frequency Alt'),
    name: 'FAC3 L3 Phase Frequency Alt',
    nodeId: 'ns=2;i=61',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Waves,
    unit: 'Hz',
    description: 'Grid frequency of L3 Phase (alternative address).',
    category: 'grid',
    factor: 0.01,
    phase: 'c',
    decimalPlaces: 2,
    label: 'L3 Frequency (Alt)',
  },
  {
    id: createId('PACL Inverter Current Output Power Alt'),
    name: 'PACL Inverter Current Output Power Alt',
    nodeId: 'ns=2;i=62',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Power,
    unit: 'W',
    description: 'Current active power output (alternative address).',
    category: 'inverter',
    label: 'Output Power (Alt)',
  },
  {
    id: createId('Work Mode Alt'),
    name: 'Work Mode Alt',
    nodeId: 'ns=2;i=63',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Info,
    description: 'Current operational mode (alternative address).',
    category: 'status',
    label: 'Work Mode (Alt)',
  },
  {
    id: createId('Inverter Internal Temperature Alt'),
    name: 'Inverter Internal Temperature Alt',
    nodeId: 'ns=2;i=64',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Thermometer,
    unit: '°C',
    description: 'Internal temperature (alternative address).',
    category: 'inverter',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'Internal Temperature (Alt)',
  },
  {
    id: createId('Error Message High Byte'),
    name: 'Error Message High Byte',
    nodeId: 'ns=2;i=65',
    dataType: 'UInt16',
    uiType: 'display',
    icon: AlertTriangle,
    description: 'High byte of the current error message code.',
    category: 'status',
    notes: 'Combine with low byte for complete error code.',
    label: 'Error Message (High)',
  },
  {
    id: createId('Error Message Low Byte'),
    name: 'Error Message Low Byte',
    nodeId: 'ns=2;i=66',
    dataType: 'UInt16',
    uiType: 'display',
    icon: AlertTriangle,
    description: 'Low byte of the current error message code.',
    category: 'status',
    notes: 'Combine with high byte for complete error code.',
    label: 'Error Message (Low)',
  },
  {
    id: createId('High Byte of Total Feed Power To Grid Alt'),
    name: 'High Byte of Total Feed Power To Grid Alt',
    nodeId: 'ns=2;i=67',
    dataType: 'UInt16',
    uiType: 'display',
    icon: FileOutput,
    unit: 'kWh',
    description: 'High word of total energy fed to grid (alternative address).',
    category: 'energy',
    factor: 0.1,
    notes: 'Combine with low byte for the complete 32-bit value.',
    label: 'Total Export (High Word, Alt)',
  },
  {
    id: createId('Low Byte of Total Feed Power To Grid Alt'),
    name: 'Low Byte of Total Feed Power To Grid Alt',
    nodeId: 'ns=2;i=68',
    dataType: 'UInt16',
    uiType: 'display',
    icon: FileOutput,
    unit: 'kWh',
    description: 'Low word of total energy fed to grid (alternative address).',
    category: 'energy',
    factor: 0.1,
    notes: 'Combine with high byte for the complete 32-bit value.',
    label: 'Total Export (Low Word, Alt)',
  },
  {
    id: createId('High Byte of Total Feeding Hours Alt'),
    name: 'High Byte of Total Feeding Hours Alt',
    nodeId: 'ns=2;i=69',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    unit: 'hr',
    description: 'High word of total operational hours (alternative address).',
    category: 'energy',
    notes: 'Combine with low byte for the complete 32-bit value.',
    label: 'Total Hours (High Word, Alt)',
  },
  {
    id: createId('Low Byte of Total Feeding Hours Alt'),
    name: 'Low Byte of Total Feeding Hours Alt',
    nodeId: 'ns=2;i=70',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Clock,
    unit: 'hr',
    description: 'Low word of total operational hours (alternative address).',
    category: 'energy',
    notes: 'Combine with high byte for the complete 32-bit value.',
    label: 'Total Hours (Low Word, Alt)',
  },
  {
    id: createId('Firmware Version'),
    name: 'Firmware Version',
    nodeId: 'ns=2;i=71',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Info,
    description: 'The firmware version of the inverter.',
    category: 'status',
    label: 'Firmware Version',
  },
  {
    id: createId('Warning Code'),
    name: 'Warning Code',
    nodeId: 'ns=2;i=72',
    dataType: 'UInt16',
    uiType: 'display',
    icon: AlertTriangle,
    description: 'The current warning code.',
    category: 'status',
    label: 'Warning Code',
  },
  {
    id: createId('RSVD 792'),
    name: 'RSVD 792',
    nodeId: 'ns=2;i=73',
    dataType: 'UInt16',
    uiType: 'display',
    icon: HelpCircle,
    unit: 'V',
    description: 'Reserved register.',
    category: 'status',
    factor: 0.1,
    label: 'Reserved (792)',
  },
  {
    id: createId('Function Status Bits'),
    name: 'Function Status Bits',
    nodeId: 'ns=2;i=74',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Settings,
    description: 'A bitfield representing the status of various functions.',
    category: 'status',
    notes: 'Requires bit-masking to interpret individual function statuses.',
    label: 'Function Status Bits',
  },
  {
    id: createId('RSVD 794'),
    name: 'RSVD 794',
    nodeId: 'ns=2;i=75',
    dataType: 'UInt16',
    uiType: 'display',
    icon: HelpCircle,
    unit: 'V',
    description: 'Reserved register.',
    category: 'status',
    factor: 0.1,
    label: 'Reserved (794)',
  },
  {
    id: createId('RSVD 795'),
    name: 'RSVD 795',
    nodeId: 'ns=2;i=76',
    dataType: 'UInt16',
    uiType: 'display',
    icon: HelpCircle,
    unit: 'V',
    description: 'Reserved register.',
    category: 'status',
    factor: 0.1,
    label: 'Reserved (795)',
  },
  {
    id: createId('Bus Voltage'),
    name: 'Bus Voltage',
    nodeId: 'ns=2;i=77',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Internal DC bus voltage.',
    category: 'inverter',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'Bus Voltage',
  },
  {
    id: createId('NBus Voltage'),
    name: 'NBus Voltage',
    nodeId: 'ns=2;i=78',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Zap,
    unit: 'V',
    description: 'Internal N-Bus voltage.',
    category: 'inverter',
    factor: 0.1,
    decimalPlaces: 1,
    label: 'N-Bus Voltage',
  },
  {
    id: createId('RSVD 798'),
    name: 'RSVD 798',
    nodeId: 'ns=2;i=79',
    dataType: 'UInt16',
    uiType: 'display',
    icon: HelpCircle,
    unit: 'Hz',
    description: 'Reserved register.',
    category: 'status',
    factor: 0.01,
    label: 'Reserved (798)',
  },
  {
    id: createId('Safety Code'),
    name: 'Safety Code',
    nodeId: 'ns=2;i=80',
    dataType: 'UInt16',
    uiType: 'display',
    icon: Settings,
    description: 'The currently configured safety grid code.',
    category: 'settings',
    label: 'Safety Code',
  },
  {
    id: createId('Feed Power To Grid Today Daily Power Generation'),
    name: 'Feed Power To Grid Today Daily Power Generation',
    nodeId: 'ns=2;i=81',
    dataType: 'UInt16',
    uiType: 'display',
    icon: FileOutput,
    unit: 'kWh',
    description: 'Total energy fed to the grid today.',
    category: 'energy',
    factor: 0.1,
    decimalPlaces: 1,
    label: "Today's Export",
  },
  
  // --- END OF GENERATED DATA POINTS ---
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