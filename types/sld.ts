// types/sld.ts
import type { Node, Edge } from 'reactflow';
import type { LucideIcon } from 'lucide-react';
import { UserRole } from './auth'; // Assuming this path and type are correct

export interface DataPoint {
  label: string;        // User-friendly display label for UI lists, configs etc.
  id: string;           // Unique kebab-case identifier (e.g., 'inverter-1-power-output')
  name: string;         // Human-readable name (e.g., 'Inverter 1 Power Output')
  nodeId: string;       // OPC UA Node ID or other system identifier
  dataType:
  | 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32'
  | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte'
  | 'Int64' | 'UInt64' | 'StatusCode' | 'LocalizedText'; // Added common OPC types
  uiType?: 'display' | 'button' | 'switch' | 'gauge' | 'input'; // UI rendering hint
  icon?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>; // Allow functional components for icons
  unit?: string;         // Physical unit (V, A, W, kWh, %, Hz, °C, etc.)
  min?: number;          // For validation, gauges, inputs
  max?: number;          // For validation, gauges, inputs
  description?: string;  // Tooltip or additional info
  category?: string;     // Grouping (e.g., 'Battery', 'Grid', 'Inverter', 'Control')
  factor?: number;       // Multiplier for raw value display (e.g., 0.001 for kW from W)
  precision?: number;    // Default number of decimal places for display
  isWritable?: boolean;  // Can this data point be written back to the source?
  enumSet?: Record<number | string, string>; // For Int types that represent an enumeration
}

export type RealTimeData = Record<string, any>; // Keyed by DataPoint.id, value is the actual data

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
  notes?: string; // Optional notes field for any node
  assetId?: string; // Optional asset identifier
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
}

// --- Specific Node Data Types (Extending BaseNodeData) ---
export interface TextLabelNodeData extends BaseNodeData {
  elementType: SLDElementType.TextLabel;
  text?: string;                       
  styleConfig?: TextNodeStyleConfig;   
}

export interface TextLabelNodeData extends BaseNodeData {
  elementType: SLDElementType.TextLabel;
  text?: string;
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
        normallyOpen?: boolean; // Typically breakers are designed to be closed, this might apply more to switches/isolators
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
        ratingMVA?: string; // Changed to string to support values like "2.5MVA"
        primaryVoltage?: string; // e.g. "11kV"
        secondaryVoltage?: string; // e.g. "0.4kV"
        vectorGroup?: string; // e.g. "Dyn11"
        impedancePercentage?: number;
    };
}

export interface GeneratorNodeData extends BaseNodeData {
    elementType: SLDElementType.Generator;
    config?: BaseNodeData['config'] & {
        fuelType?: 'Diesel' | 'Gas' | 'Hydro' | 'Wind';
        ratingKVA?: string; // Changed to string to support "100kVA"
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
        deviceType?: string; // e.g. 'JunctionBox', 'Relay', 'TransferSwitch'
        iconName?: string; 
    };
}

// Union of all specific node data types
export type CustomNodeData =
  | TextLabelNodeData | DataLabelNodeData | InverterNodeData | PanelNodeData
  | BreakerNodeData | MeterNodeData | BatteryNodeData | ContactorNodeData
  | GridNodeData | LoadNodeData | BusbarNodeData | GenericDeviceNodeData
  | TransformerNodeData | GeneratorNodeData | PLCNodeData | SensorNodeData; // Added new types


// --- Edge Data ---
export interface CustomFlowEdgeData {
  label?: string;                    
  dataPointLinks?: DataPointLink[];  
  flowType?: 'AC' | 'DC' | 'CONTROL_SIGNAL' | 'DATA_BUS' | 'NEUTRAL' | 'EARTH' | 'OFFLINE' | 'FAULT' | string; // Added Neutral, Earth
  voltageLevel?: 'HV' | 'MV' | 'LV' | 'ELV' | string; 
  currentRatingAmps?: number; // For cable sizing / ampacity
  cableType?: string; // e.g. "2x(4cx300) XLPE/Al"
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
  Generator = 'generator', // e.g., Diesel, Gas Turbine
  Grid = 'grid', // Utility Grid Connection Point
  
  // Storage
  Battery = 'battery', 
  
  // Conversion & Transformation
  Inverter = 'inverter', 
  Transformer = 'transformer', // Power Transformer
  // Add Rectifier, VFD if needed
  
  // Switching & Protection
  Breaker = 'breaker',     // Generic Breaker (can be detailed by config.type)
  Contactor = 'contactor', 
  Fuse = 'fuse',           // Added Fuse
  Isolator = 'isolator',   // Added Isolator/Disconnect Switch
  ATS = 'ats',             // Automatic Transfer Switch (often a GenericDevice or own type)

  // Distribution & Connection
  Busbar = 'busbar', 
  JunctionBox = 'junctionBox', // Could be a GenericDevice or specific type
  Cable = 'cable',             // For representing distinct cable runs if needed, though often just edges
  
  // Loads
  Load = 'load',           // Generic Electrical Load
  Motor = 'motor',         // Specific Motor Load
  
  // Measurement & Metering
  Meter = 'meter',         // Energy Meter, Power Analyzer
  Sensor = 'sensor',       // Generic Sensor (temp, pressure, flow, irradiance etc.)
  CT = 'ct',               // Current Transformer
  PT = 'pt',               // Potential (Voltage) Transformer
  
  // Control & Automation
  PLC = 'plc',             // Programmable Logic Controller
  Relay = 'relay',         // Protective or Control Relay (could be GenericDevice)
  // Add HMI, ControlPanel etc.
  
  // Annotations & Labels
  DataLabel = 'dataLabel', 
  TextLabel = 'textLabel', 
  
  // Generic / Grouping
  GenericDevice = 'genericDevice', // Fallback or for diverse non-specific items
  Group = 'group',                 // For visual grouping if React Flow's grouping is used
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

// (CurrentUser and SLDState interfaces might be better in more specific auth/state files,
// but included here for completeness based on original file structure.)
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