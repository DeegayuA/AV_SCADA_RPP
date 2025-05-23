import type { Node, Edge } from 'reactflow';
import type { LucideIcon } from 'lucide-react';
import { UserRole } from './auth'; // Assuming this path and type are correct

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
  icon?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  unit?: string;
  min?: number;
  max?: number;
  description?: string;
  category?: string;
  factor?: number;
  precision?: number;
  isWritable?: boolean;
  decimalPlaces?: number;
  enumSet?: Record<number | string, string>;
}

export type RealTimeData = Record<string, any>;

export interface DataPointLink {
  dataPointId: string;
  targetProperty: string;
  valueMapping?: {
    type?: 'exact' | 'range' | 'threshold' | 'boolean' | string;
    mapping: Array<{
      match?: any;
      min?: number;
      max?: number;
      threshold?: number;
      value: any;
    }>;
    defaultValue?: any;
  };
  format?: {
    type: 'number' | 'boolean' | 'dateTime' | 'string';
    precision?: number;
    prefix?: string;
    suffix?: string;
    trueLabel?: string;
    falseLabel?: string;
    dateTimeFormat?: string;
  };
}

// --- Base Node Data (Common to all custom nodes) ---
export interface BaseNodeData {
  label: string;
  elementType: SLDElementType;
  status?: 'nominal' | 'warning' | 'alarm' | 'offline' | 'producing' | 'running' | 'reading' | 'connected' | 'closed' | 'open' | 'active' | 'charging' | 'discharging' | string;
  config?: Record<string, any>;
  dataPointLinks?: DataPointLink[];
  isDrillable?: boolean;
  subLayoutId?: string;
  notes?: string;
  assetId?: string;
}

// --- Text Node Specific Styling ---
export interface TextNodeStyleConfig {
  fontSize?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  padding?: string;
  fontFamily?: string;
  borderRadius?: string;
}

// --- Specific Node Data Types (Extending BaseNodeData) ---
export interface TextLabelNodeData extends BaseNodeData {
  elementType: SLDElementType.TextLabel;
  text?: string;
  styleConfig?: TextNodeStyleConfig;
}

export interface DataLabelNodeData extends BaseNodeData {
  elementType: SLDElementType.DataLabel;
  styleConfig?: TextNodeStyleConfig;
}

export interface InverterNodeData extends BaseNodeData {
  elementType: SLDElementType.Inverter;
  config?: BaseNodeData['config'] & {
    ratedPower?: number; // kW
    efficiency?: number; // %
  };
}
export interface PanelNodeData extends BaseNodeData {
    elementType: SLDElementType.Panel;
    config?: BaseNodeData['config'] & {
        technology?: 'Mono-Si' | 'Poly-Si' | 'Thin-film';
        powerRatingWp?: number; // Watts-peak
    };
}
export interface BreakerNodeData extends BaseNodeData {
    elementType: SLDElementType.Breaker;
    config?: BaseNodeData['config'] & {
        type?: 'MCB' | 'MCCB' | 'ACB' | 'VCB' | 'SF6' | string; // Breaker type
        tripRatingAmps?: number;
        interruptingCapacitykA?: number;
        normallyOpen?: boolean;
    };
}
export interface MeterNodeData extends BaseNodeData {
    elementType: SLDElementType.Meter;
    config?: BaseNodeData['config'] & {
        meterType?: 'Energy' | 'PowerQuality' | 'SubMeter';
        accuracyClass?: string;
    };
}
export interface BatteryNodeData extends BaseNodeData {
    elementType: SLDElementType.Battery;
    config?: BaseNodeData['config'] & {
        technology?: 'Li-ion' | 'Lead-Acid' | 'Flow';
        capacityAh?: number;
        voltageNominalV?: number;
        dodPercentage?: number; // Depth of Discharge
    };
}
export interface ContactorNodeData extends BaseNodeData {
    elementType: SLDElementType.Contactor;
    config?: BaseNodeData['config'] & {
        normallyOpen?: boolean; // true for NO, false for NC
        coilVoltage?: string; // e.g., '24VDC', '230VAC'
    };
}
export interface GridNodeData extends BaseNodeData {
    elementType: SLDElementType.Grid;
    config?: BaseNodeData['config'] & {
        voltageLevel?: string; // e.g., '11kV', '33kV', '400V'
        frequencyHz?: 50 | 60;
        faultLevelMVA?: number;
    };
}
export interface LoadNodeData extends BaseNodeData {
    elementType: SLDElementType.Load;
    config?: BaseNodeData['config'] & {
        loadType?: 'Resistive' | 'Inductive' | 'Capacitive' | 'Motor' | 'Lighting';
        ratedPowerkW?: number;
        powerFactor?: number;
    };
}
export interface BusbarNodeData extends BaseNodeData {
    elementType: SLDElementType.Busbar;
    config?: BaseNodeData['config'] & {
        material?: 'Copper' | 'Aluminum';
        currentRatingAmps?: number;
        width?: number; // For visual representation if fixed
        height?: number; // For visual representation if fixed
    };
}

export interface TransformerNodeData extends BaseNodeData {
    elementType: SLDElementType.Transformer;
    config?: BaseNodeData['config'] & {
        ratingMVA?: string;
        primaryVoltage?: string;
        secondaryVoltage?: string;
        vectorGroup?: string;
        impedancePercentage?: number;
    };
}

export interface GeneratorNodeData extends BaseNodeData {
    elementType: SLDElementType.Generator;
    config?: BaseNodeData['config'] & {
        fuelType?: 'Diesel' | 'Gas' | 'Hydro' | 'Wind';
        ratingKVA?: string;
        outputVoltage?: string;
    };
}

export interface PLCNodeData extends BaseNodeData {
    elementType: SLDElementType.PLC;
    config?: BaseNodeData['config'] & {
        model?: string;
        ipAddress?: string;
    };
}

export interface SensorNodeData extends BaseNodeData {
    elementType: SLDElementType.Sensor;
    config?: BaseNodeData['config'] & {
        sensorType?: 'Temperature' | 'Irradiance' | 'WindSpeed' | 'Pressure' | 'Flow';
        measurementRange?: string;
    };
}

export interface GenericDeviceNodeData extends BaseNodeData {
    elementType: SLDElementType.GenericDevice;
    config?: BaseNodeData['config'] & {
        deviceType?: string;
        iconName?: string;
    };
}

export interface IsolatorNodeData extends BaseNodeData {
    elementType: SLDElementType.Isolator;
    config?: BaseNodeData['config'] & {
        poles?: number;
        loadBreak?: boolean;
        manualOrMotorized?: 'manual' | 'motorized';
    };
}

export interface ATSNodeData extends BaseNodeData {
    elementType: SLDElementType.ATS;
    config?: BaseNodeData['config'] & {
        transferTimeMs?: number;
        numPoles?: number;
    };
}

export interface JunctionBoxNodeData extends BaseNodeData {
    elementType: SLDElementType.JunctionBox;
    config?: BaseNodeData['config'] & {
        material?: string;
        ipRating?: string;
        numberOfStrings?: number;
    };
}

export interface FuseNodeData extends BaseNodeData { // <<<--- ADDED THIS DEFINITION
    elementType: SLDElementType.Fuse;
    config?: BaseNodeData['config'] & {
        ratingAmps?: number;
        voltageRating?: string; // e.g., "400V", "690V"
        fuseType?: 'Cartridge' | 'HRC' | 'Rewireable' | 'Semiconductor' | string; // High Rupturing Capacity
        breakingCapacitykA?: number;
    };
}

// Union of all specific node data types
export type CustomNodeData =
  | TextLabelNodeData | DataLabelNodeData | InverterNodeData | PanelNodeData
  | BreakerNodeData | MeterNodeData | BatteryNodeData | ContactorNodeData
  | GridNodeData | LoadNodeData | BusbarNodeData | GenericDeviceNodeData
  | TransformerNodeData | GeneratorNodeData | PLCNodeData | SensorNodeData
  | IsolatorNodeData | ATSNodeData | JunctionBoxNodeData | FuseNodeData; // <<<--- ADDED FuseNodeData to UNION


// --- Edge Data ---
export interface CustomFlowEdgeData {
  label?: string;
  dataPointLinks?: DataPointLink[];
  flowType?: 'AC' | 'DC' | 'CONTROL_SIGNAL' | 'DATA_BUS' | 'NEUTRAL' | 'EARTH' | 'OFFLINE' | 'FAULT' | string;
  voltageLevel?: 'HV' | 'MV' | 'LV' | 'ELV' | string;
  currentRatingAmps?: number;
  cableType?: string;
  isEnergized?: boolean;
  status?: 'nominal' | 'warning' | 'fault' | string;
}

// --- React Flow Element Types ---
export type CustomNodeType = Node<CustomNodeData, SLDElementType | string>;
export type CustomFlowEdge = Edge<CustomFlowEdgeData>;

// --- SLD Layout Structure ---
export interface SLDLayout {
  layoutId: string;
  nodes: CustomNodeType[];
  edges: CustomFlowEdge[];
  viewport?: { x: number; y: number; zoom: number; };
  meta?: {
    description?: string;
    lastModified?: string;
    version?: string;
    author?: string;
  }
}

// --- SLD Element Types Enum ---
export enum SLDElementType {
  // Electrical Power Generation & Sources
  Panel = 'panel',
  Generator = 'generator',
  Grid = 'grid',

  // Storage
  Battery = 'battery',

  // Conversion & Transformation
  Inverter = 'inverter',
  Transformer = 'transformer',

  // Switching & Protection
  Breaker = 'breaker',
  Contactor = 'contactor',
  Fuse = 'fuse',
  Isolator = 'isolator',
  ATS = 'ats',

  // Distribution & Connection
  Busbar = 'busbar',
  JunctionBox = 'junctionBox',
  Cable = 'cable',

  // Loads
  Load = 'load',
  Motor = 'motor',

  // Measurement & Metering
  Meter = 'meter',
  Sensor = 'sensor',
  CT = 'ct',
  PT = 'pt',

  // Control & Automation
  PLC = 'plc',
  Relay = 'relay',

  // Annotations & Labels
  DataLabel = 'dataLabel',
  TextLabel = 'textLabel',

  // Generic / Grouping
  GenericDevice = 'genericDevice',
  Group = 'group',
}

// --- Palette Configuration ---
export interface PaletteComponent {
  type: SLDElementType;
  label: string;
  defaultData?: Partial<CustomNodeData>;
  icon?: React.ReactNode;
  description?: string;
}

export interface PaletteCategory {
  name:string;
  components: PaletteComponent[];
}

// --- Component Props for SLDWidget ---
export interface SLDWidgetProps {
  layoutId: string | null;
  isEditMode?: boolean;
  currentUserRole?: UserRole;
  onNavigateToLayout?: (layoutId: string) => void;
}

export interface CurrentUser {
  id: string;
  role: 'admin' | 'operator' | 'viewer' | string;
}

export interface SLDState {
  realtimeData: RealTimeData;
  dataPoints: Record<string, DataPoint>;
  isEditMode: boolean;
  currentUser: CurrentUser | null;
}