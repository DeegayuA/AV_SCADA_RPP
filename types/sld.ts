// types/sld.ts
import type { Node, Edge, Viewport } from 'reactflow';
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

export type RealTimeData = Record<string, string | number | boolean | null | undefined>; // Allow null/undefined from OPC UA

export interface DataPointLink {
  dataPointId: string;
  targetProperty: string; // e.g., 'status', 'soc', 'powerOutput', 'breaker.isOpen'
  valueMapping?: {
    type?: 'exact' | 'range' | 'threshold' | 'boolean' | 'enum' | string; // Added 'enum' for clarity
    mapping: Array<{
      match?: any;         // For 'exact' or 'enum' mapping
      min?: number;        // For 'range' mapping
      max?: number;        // For 'range' mapping
      threshold?: number;  // For 'threshold' mapping
      value: any;          // The value to set on the targetProperty
    }>;
    defaultValue?: any;    // Fallback value if no mapping matches
  };
  format?: {
    type: 'number' | 'boolean' | 'dateTime' | 'string';
    precision?: number;     // For 'number' type
    prefix?: string;        // For 'string' or 'number' type
    suffix?: string;        // For 'string' or 'number' type
    trueLabel?: string;     // For 'boolean' type
    falseLabel?: string;    // For 'boolean' type
    dateTimeFormat?: string;// For 'dateTime' type, e.g., "YYYY-MM-DD HH:mm:ss"
  };
}

export type InverterType = 'on-grid' | 'off-grid' | 'hybrid';

export interface InverterNodeSpecificConfig { // Renamed for clarity and to avoid conflict if BaseNodeData.config is generic
  ratedPower?: number; // kW
  warningTemperature?: number;
  maxOperatingTemperature?: number;
  inverterType?: InverterType;
  efficiency?: number; // Moved from InverterNodeData to config
  // other inverter-specific config
}

// --- Base Node Data (Common to all custom nodes) ---
export interface BaseNodeData {
  label: string;
  elementType: SLDElementType;
  status?: string; // General status string (e.g. "Running", "Fault", "Offline")
  config?: Record<string, any>; // Generic config object, specific nodes will extend this
  dataPointLinks?: DataPointLink[];
  isDrillable?: boolean;
  subLayoutId?: string;
  notes?: string;
  assetId?: string;
  width?: number | null; // Allow node dimensions to be part of data for persistence
  height?: number | null;
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
  // 'value' to display comes from a DataPointLink to targetProperty: 'value'
  styleConfig?: TextNodeStyleConfig; 
}

export interface InverterNodeData extends BaseNodeData {
  elementType: SLDElementType.Inverter;
  // Status can be directly set or driven by dataPointLinks (commonTargetProperty: 'status')
  // powerOutput and temperature should be driven by dataPointLinks to specific target properties (e.g. 'inverter.powerOutput', 'temperature')
  config?: InverterNodeSpecificConfig & BaseNodeData['config']; // Combine specific with generic
}

export interface PanelNodeData extends BaseNodeData {
    elementType: SLDElementType.Panel;
    config?: BaseNodeData['config'] & {
        technology?: 'Mono-Si' | 'Poly-Si' | 'Thin-film' | string; // Allow custom strings
        powerRatingWp?: number;
        numberOfPanels?: number;
    };
}
export interface BreakerNodeData extends BaseNodeData {
    elementType: SLDElementType.Breaker;
    // isOpen state is typically driven by dataPointLinks (nodeSpecificTargetProperty: 'breaker.isOpen')
    config?: BaseNodeData['config'] & {
        type?: 'MCB' | 'MCCB' | 'ACB' | 'VCB' | 'SF6' | string;
        tripRatingAmps?: number;
        interruptingCapacitykA?: number;
        normallyOpen?: boolean; // Default state if not driven by DP
        controlNodeId?: string; 
    };
}
export interface MeterNodeData extends BaseNodeData {
    elementType: SLDElementType.Meter;
    config?: BaseNodeData['config'] & {
        meterType?: 'Energy' | 'PowerQuality' | 'SubMeter' | string;
        accuracyClass?: string;
    };
}
export interface BatteryNodeData extends BaseNodeData {
    elementType: SLDElementType.Battery;
    // soc and powerFlow are driven by dataPointLinks (nodeSpecificTargetProperties 'soc' and 'powerFlow')
    config?: BaseNodeData['config'] & {
        technology?: 'Li-ion' | 'LFP' | 'Lead-Acid' | 'Flow' | 'NiCd' | 'Other' | string; // Added LFP, NiCd, Other from inspector
        capacityAh?: number;
        voltageNominalV?: number;
        dodPercentage?: number;
        numModules?: number; // From BatteryNode Inspector
        soc?: number; // Manual/fallback SOC, from BatteryNode Inspector
    };
}
export interface ContactorNodeData extends BaseNodeData {
    elementType: SLDElementType.Contactor;
    // isClosed state is driven by dataPointLinks (nodeSpecificTargetProperty: 'contactor.isClosed')
    config?: BaseNodeData['config'] & {
        normallyOpen?: boolean; // Default state
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
        loadType?: 'Resistive' | 'Inductive' | 'Capacitive' | 'Motor' | 'Lighting' | string;
        ratedPowerkW?: number;
        powerFactor?: number;
    };
}
export interface BusbarNodeData extends BaseNodeData {
    elementType: SLDElementType.Busbar;
    config?: BaseNodeData['config'] & {
        material?: 'Copper' | 'Aluminum' | string;
        currentRatingAmps?: number;
        // width and height are now part of BaseNodeData for all nodes
    };
}

export interface TransformerNodeData extends BaseNodeData {
    elementType: SLDElementType.Transformer;
    config?: BaseNodeData['config'] & {
        ratingMVA?: string; // Consider number if calculations needed
        primaryVoltage?: string; // Consider number
        secondaryVoltage?: string; // Consider number
        vectorGroup?: string;
        impedancePercentage?: number;
    };
}

export interface GeneratorNodeData extends BaseNodeData {
    elementType: SLDElementType.Generator;
    config?: BaseNodeData['config'] & {
        fuelType?: 'Diesel' | 'Gas' | 'Hydro' | 'Wind' | string;
        ratingKVA?: string; // Consider number
        outputVoltage?: string; // Consider number
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
        sensorType?: 'Temperature' | 'Irradiance' | 'WindSpeed' | 'Pressure' | 'Flow' | string;
        measurementRange?: string;
    };
}

export interface GenericDeviceNodeData extends BaseNodeData {
    elementType: SLDElementType.GenericDevice;
    config?: BaseNodeData['config'] & {
        deviceType?: string; // User-defined type shown on node
        iconName?: string; // Lucide icon name
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
        controlNodeId?: string; // For smart fuses or those with feedback
    };
}

export interface GaugeNodeData extends BaseNodeData {
  elementType: SLDElementType.Gauge;
  config?: BaseNodeData['config'] & {
    minVal?: number;
    maxVal?: number;
    valueDataPointLink?: DataPointLink; // Direct link for the main gauge value
    unit?: string; // Unit displayed on the gauge
  };
}
export type SwitchType = 'two-way' | 'three-way'; // Add this type

export interface SwitchNodeConfig { // Specific config for SwitchNode
  switchType?: SwitchType;
  numPoles?: number; // For visual representation (e.g., SPDT, DPDT) - default 1
  // For 2-way and general control/status
  controlNodeId?: string; // Primary control/status node ID
  // For 3-way switches if using separate control points per position:
  controlNodeIdPos1?: string; // Write to this to activate position 1
  controlNodeIdPos2?: string; // Write to this to activate position 2
  // For 3-way switches if using a single status DP with different values for positions:
  stateValuePos1?: string | number | boolean; // Value from main status DP indicating Position 1 is active
  stateValueOff?: string | number | boolean;  // Value from main status DP indicating OFF state
  stateValuePos2?: string | number | boolean; // Value from main status DP indicating Position 2 is active
  
  normallyOpen?: boolean; // For simple two-way interpretation if no explicit state DP
}

export interface SwitchNodeData extends BaseNodeData {
  elementType: SLDElementType.Switch;
  config?: BaseNodeData['config'] & {
    numPositions?: number;
    controlNodeId?: string; // For controllable switches
    normallyOpen?: boolean; // If it functions like a simple open/close switch
  };
}

// Union of all specific node data types
export type CustomNodeData =
  | TextLabelNodeData | DataLabelNodeData | InverterNodeData | PanelNodeData
  | BreakerNodeData | MeterNodeData | BatteryNodeData | ContactorNodeData
  | GridNodeData | LoadNodeData | BusbarNodeData | GenericDeviceNodeData
  | TransformerNodeData | GeneratorNodeData | PLCNodeData | SensorNodeData
  | IsolatorNodeData | ATSNodeData | JunctionBoxNodeData | FuseNodeData | GaugeNodeData
  | SwitchNodeData;

  export type DynamicFlowType =
  | 'bidirectional_from_net'          // Uses gridNetFlowDataPointId, +/- determines direction
  | 'bidirectional_gen_vs_usage'    // Uses generationDataPointId & usageDataPointId, (Gen-Usage) determines direction
  | 'unidirectional_export'         // Uses dynamicMagnitudeDataPointId, flow is always Target->Source (reverse) by default
  | 'unidirectional_import';          // Uses dynamicMagnitudeDataPointId, flow is always Source->Target (forward) by default

export type AnimationType = 'none' | 'dynamic_power_flow' | 'constant_unidirectional';


export interface AnimationFlowConfig {
  animationType?: AnimationType; // Use the defined type

  // --- Dynamic Power Flow Specific ---
  dynamicFlowType?: DynamicFlowType;       
  generationDataPointId?: string;          
  usageDataPointId?: string;               
  gridNetFlowDataPointId?: string;         
  dynamicMagnitudeDataPointId?: string;    
  
  speedMultiplier?: number;                
  invertFlowDirection?: boolean;           
  minDynamicDuration?: number;             // Min duration for one particle traversal
  maxDynamicDuration?: number;             // Max duration for one particle traversal (used when magnitude is zero/low)
  dynamicSpeedBaseDivisor?: number;        // Higher = slower base speed for magnitude-driven animation

  // --- Constant Unidirectional Flow Specific ---
  constantFlowDirection?: 'forward' | 'reverse'; // Forward: S->T, Reverse: T->S
  constantFlowSpeed?: 'slow' | 'medium' | 'fast' | number; // Number is custom duration
  constantFlowActivationDataPointId?: string; // DP to turn this constant flow on/off
  minConstantDuration?: number;            // Particle travel duration for 'fast' or custom if speed is a number
  maxConstantDuration?: number;            // Particle travel duration for 'slow'
}


// --- Edge Data ---
export interface CustomFlowEdgeData {
  label?: string;
  dataPointLinks?: DataPointLink[]; 
  flowType?: 'AC' | 'DC' | 'CONTROL_SIGNAL' | 'DATA_BUS' | 'NEUTRAL' | 'EARTH' | 'OFFLINE' | 'FAULT' | string;
  voltageLevel?: 'HV' | 'MV' | 'LV' | 'ELV' | string;
  currentRatingAmps?: number;
  cableType?: string;
  isEnergized?: boolean; 
  status?: string;       

  animationSettings?: AnimationFlowConfig;
}

// --- React Flow Element Types ---
export type CustomNodeType = Node<CustomNodeData, SLDElementType | string>; // type: string to allow custom node types if needed
export type CustomFlowEdge = Edge<CustomFlowEdgeData>;

// --- Global Settings specifically for SLD Layout Animation ---
export interface GlobalSLDAnimationSettings extends AnimationFlowConfig { // Can inherit from AnimationFlowConfig for common base settings
  isEnabled?: boolean;
  // This specific override changes how positive/negative values are interpreted for bidirectional flows system-wide
  globallyInvertDefaultDynamicFlowLogic?: boolean; 
}

// --- SLD Layout Structure ---
export interface SLDLayout {
  layoutId: string;
  nodes: CustomNodeType[];
  edges: CustomFlowEdge[];
  viewport?: Viewport;
  meta?: {
    name?: string; // Changed description to name for better distinction
    description?: string;
    lastModified?: string;
    version?: string;
    author?: string;
    globalAnimationSettings?: GlobalSLDAnimationSettings;
  };
}

// --- SLD Element Types Enum ---
export enum SLDElementType {
  // Electrical Power Generation & Sources
  Panel = 'panel',
  Generator = 'generator',
  Grid = 'grid',
  WindTurbine = 'windTurbine',

  // Storage
  Battery = 'battery',

  // Conversion & Transformation
  Inverter = 'inverter',
  WindInverter = 'windInverter',
  Transformer = 'transformer',

  // Switching & Protection
  Breaker = 'breaker',
  Contactor = 'contactor',
  Fuse = 'fuse',
  Isolator = 'isolator',
  ATS = 'ats', 
  Switch = "switch",

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
  Gauge = 'gauge', 

  // Control & Automation
  PLC = 'plc', 
  Relay = 'relay', // Consider if this should be GenericDevice or a specialized one

  // Annotations & Labels
  DataLabel = 'dataLabel',
  TextLabel = 'textLabel',

  // Generic / Grouping
  GenericDevice = 'genericDevice',
  Group = 'group', // For React Flow's native grouping feature if used
}

// --- Palette Configuration ---
export interface PaletteComponent {
  type: SLDElementType; // Must be one of the defined element types
  label: string;
  defaultData?: Partial<CustomNodeData>; // Initial data for this component when dragged
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
  role: UserRole; // Use imported UserRole directly
}

// Used within appStore or passed around for application state
export interface SLDAppState {
  opcUaNodeValues: RealTimeData; // State of all relevant OPC UA nodes
  dataPoints: Record<string, DataPoint>; // Configuration for all data points
  isEditMode: boolean;
  currentUser: CurrentUser | null;
  // Add other global states if they directly impact SLD rendering or behavior outside React Flow elements themselves
}