// types/sld.ts
import type { Node, Edge, Viewport } from 'reactflow'; // Combined Viewport import
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
  precision?: number; // Typically for display formatting, used by formatValue util
  isWritable?: boolean;
  decimalPlaces?: number; // Can be synonymous with precision for formatting
  enumSet?: Record<number | string, string>;
}

export type RealTimeData = Record<string, string | number | boolean>;

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
  status?: string; // Broadened status type
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
    ratedPower?: number; 
    efficiency?: number; 
  };
}
export interface PanelNodeData extends BaseNodeData {
    elementType: SLDElementType.Panel;
    config?: BaseNodeData['config'] & {
        technology?: 'Mono-Si' | 'Poly-Si' | 'Thin-film';
        powerRatingWp?: number;
    };
}
export interface BreakerNodeData extends BaseNodeData {
    elementType: SLDElementType.Breaker;
    config?: BaseNodeData['config'] & {
        type?: 'MCB' | 'MCCB' | 'ACB' | 'VCB' | 'SF6' | string;
        tripRatingAmps?: number;
        interruptingCapacitykA?: number;
        normallyOpen?: boolean;
        controlNodeId?: string; 
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
        dodPercentage?: number;
    };
}
export interface ContactorNodeData extends BaseNodeData {
    elementType: SLDElementType.Contactor;
    config?: BaseNodeData['config'] & {
        normallyOpen?: boolean;
        coilVoltage?: string;
        controlNodeId?: string;
    };
}
export interface GridNodeData extends BaseNodeData {
    elementType: SLDElementType.Grid;
    config?: BaseNodeData['config'] & {
        voltageLevel?: string; 
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
        width?: number; 
        height?: number; 
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
        controlNodeId?: string;
    };
}

export interface ATSNodeData extends BaseNodeData {
    elementType: SLDElementType.ATS;
    config?: BaseNodeData['config'] & {
        transferTimeMs?: number;
        numPoles?: number;
        controlNodeId?: string;
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

export interface FuseNodeData extends BaseNodeData {
    elementType: SLDElementType.Fuse;
    config?: BaseNodeData['config'] & {
        ratingAmps?: number;
        voltageRating?: string; 
        fuseType?: 'Cartridge' | 'HRC' | 'Rewireable' | 'Semiconductor' | string;
        breakingCapacitykA?: number;
        controlNodeId?: string;
    };
}

export interface GaugeNodeData extends BaseNodeData {
  elementType: SLDElementType.Gauge;
  config?: BaseNodeData['config'] & {
    minVal?: number;
    maxVal?: number;
    valueDataPointLink?: DataPointLink;
    unit?: string;
  };
}
export interface SwitchNodeData extends BaseNodeData { // Added SwitchNodeData definition
  elementType: SLDElementType.Switch; // Assuming SLDElementType.Switch exists
  config?: BaseNodeData['config'] & {
    numPositions?: number;
    controlNodeId?: string;
  };
}

// Union of all specific node data types
export type CustomNodeData =
  | TextLabelNodeData | DataLabelNodeData | InverterNodeData | PanelNodeData
  | BreakerNodeData | MeterNodeData | BatteryNodeData | ContactorNodeData
  | GridNodeData | LoadNodeData | BusbarNodeData | GenericDeviceNodeData
  | TransformerNodeData | GeneratorNodeData | PLCNodeData | SensorNodeData
  | IsolatorNodeData | ATSNodeData | JunctionBoxNodeData | FuseNodeData | GaugeNodeData
  | SwitchNodeData; // Added SwitchNodeData

export type AnimationType = 'none' | 'dynamic_power_flow' | 'constant_unidirectional';

export interface AnimationFlowConfig {
  animationType?: AnimationType; // Defaults to 'dynamic_power_flow' if DPs are set, or 'none'

  // For 'dynamic_power_flow'
  generationDataPointId?: string;
  usageDataPointId?: string;
  gridNetFlowDataPointId?: string;
  speedMultiplier?: number;       // Applied to |net flow| for dynamic speed
  invertFlowDirection?: boolean;  // Inverts calculated dynamic direction

  // For 'constant_unidirectional'
  constantFlowDirection?: 'forward' | 'reverse'; // S->T or T->S
  constantFlowSpeed?: 'slow' | 'medium' | 'fast' | number; // Predefined or custom ms/s
  constantFlowActivationDataPointId?: string; // Optional boolean DP to toggle animation
}

export interface GlobalSLDAnimationSettings extends AnimationFlowConfig {
  // animationType here sets the GLOBAL DEFAULT animation type
  isEnabled?: boolean; // Enable/disable all global settings
  globallyInvertDefaultDynamicFlowLogic?: boolean; // Master switch for default dynamic direction logic
}

// --- Edge Data ---
export interface CustomFlowEdgeData {
  label?: string;
  dataPointLinks?: DataPointLink[]; // For status (Fault, Warning), or potentially very simple on/off animation if new system not used
  flowType?: 'AC' | 'DC' | 'CONTROL_SIGNAL' | 'DATA_BUS' | 'NEUTRAL' | 'EARTH' | 'OFFLINE' | 'FAULT' | string;
  voltageLevel?: 'HV' | 'MV' | 'LV' | 'ELV' | string;
  currentRatingAmps?: number;
  cableType?: string;
  isEnergized?: boolean; // Static/Fallback property if no dynamic animation config
  status?: string;       // Static/Fallback status

  animationSettings?: AnimationFlowConfig; // Holds the resolved animation settings for this edge
}

// --- React Flow Element Types ---
export type CustomNodeType = Node<CustomNodeData, SLDElementType | string>;
export type CustomFlowEdge = Edge<CustomFlowEdgeData>;

// --- Global Settings specifically for SLD Layout Animation ---
export interface GlobalSLDAnimationSettings extends AnimationFlowConfig {
  isEnabled?: boolean; // Master switch to enable/disable global animation settings completely
  globallyInvertDefaultFlowForAllEdges?: boolean; // Master switch to flip the NEW default direction logic for all edges
}

// --- SLD Layout Structure ---
export interface SLDLayout {
  layoutId: string;
  nodes: CustomNodeType[];
  edges: CustomFlowEdge[];
  viewport?: Viewport; // Use imported Viewport type
  meta?: {
    description?: string;
    lastModified?: string;
    version?: string;
    author?: string;
    globalAnimationSettings?: GlobalSLDAnimationSettings; // Updated to use the new specific type
  };
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
  ATS = 'ats', // Automatic Transfer Switch
  Switch = "switch", // General purpose switch / disconnector

  // Distribution & Connection
  Busbar = 'busbar',
  JunctionBox = 'junctionBox',
  Cable = 'cable', // Note: Edges usually represent cables, but a 'Cable' node type could be for specific cable details.

  // Loads
  Load = 'load',
  Motor = 'motor', // Can be a specific type of load

  // Measurement & Metering
  Meter = 'meter',
  Sensor = 'sensor',
  CT = 'ct', // Current Transformer (often a sensor or part of meter)
  PT = 'pt', // Potential Transformer (often a sensor or part of meter)
  Gauge = 'gauge', 

  // Control & Automation
  PLC = 'plc', // Programmable Logic Controller
  Relay = 'relay',

  // Annotations & Labels
  DataLabel = 'dataLabel',
  TextLabel = 'textLabel',

  // Generic / Grouping
  GenericDevice = 'genericDevice', // For anything not specifically typed
  Group = 'group', // For React Flow's grouping feature
}

// --- Palette Configuration ---
export interface PaletteComponent {
  type: SLDElementType;
  label: string;
  defaultData?: Partial<CustomNodeData>;
  icon?: React.ReactNode; // Can be LucideIcon or custom SVG component
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
  currentUserRole?: UserRole; // For permissions if needed
  onNavigateToLayout?: (layoutId: string) => void; // If drilldown/navigation is handled by parent
  // onCodeChange: defined in SLDWidget.tsx's local props interface as it's internal
}

export interface CurrentUser {
  id: string;
  role: 'admin' | 'operator' | 'viewer' | string; // Align with UserRole from './auth'
}

// Used within appStore or passed around, not directly for SLDWidget itself
export interface SLDAppState {
  opcUaNodeValues: RealTimeData;
  dataPoints: Record<string, DataPoint>;
  isEditMode: boolean;
  currentUser: CurrentUser | null;
  // Potentially other global states relevant to SLD display/interaction
}