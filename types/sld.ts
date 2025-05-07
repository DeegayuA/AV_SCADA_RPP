// types/sld.ts
import type { Node, Edge } from 'reactflow';
import type { LucideIcon } from 'lucide-react'; // Import LucideIcon type

// --- Your DataPoint Definition ---
export interface DataPoint {
  label: string;
  id: string; // Unique kebab-case identifier (e.g., 'inverter-1-power-output') - Use this as the key in records
  name: string; // Human-readable name (e.g., 'Inverter 1 Power Output')
  nodeId: string; // OPC UA Node ID
  dataType: // Use OPC UA inspired types or map them
  | 'Boolean' | 'Float' | 'Double' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32'
  | 'String' | 'DateTime' | 'ByteString' | 'Guid' | 'Byte' | 'SByte'
  | 'Int64' | 'UInt64';
  uiType?: 'display' | 'button' | 'switch' | 'gauge'; // How to render in UI (optional)
  icon?: LucideIcon; // Icon representation (make optional for simplicity)
  unit?: string; // Physical unit (V, A, W, kWh, %, Hz, °C, etc.)
  min?: number; // Minimum value for gauges/validation
  max?: number; // Maximum value for gauges/validation
  description?: string; // Tooltip or extra info
  category?: string; // Grouping (e.g., 'battery', 'grid', 'inverter', 'control', etc.) - make string for flexibility
  factor?: number; // Multiplier for raw value (e.g., 0.1, 0.01, 0.001)
  phase?: 'a' | 'b' | 'c' | 'x'; // Phase identifier ('x' for non-phase specific or total)
  isSinglePhase?: boolean; // Hint for UI rendering
  threePhaseGroup?: string; // Link related phase items (e.g., 'grid-voltage')
  notes?: string; // Internal notes for clarification/TODOs
}

// Structure for real-time data values (key = dataPoint.id)
export type RealTimeData = Record<string, any>;

// --- SLD Element Configuration ---

// Defines how a data point influences an element's visual property
export interface DataPointLink {
  dataPointId: string; // ID of the DataPoint
  targetProperty: string; // Which visual property to affect (e.g., 'fillColor', 'value', 'visible')
  valueMapping?: { // Optional: Define rules for mapping data values to visual states
    type?: string;
    mapping: any[]; // Examples provided in previous types
    defaultValue?: any;
  };
  format?: { // Optional: Format the displayed value
    type: 'number' | 'boolean' | 'dateTime' | 'string'; // Align with DataPoint dataType potentially
    precision?: number; // For number
    prefix?: string;    // For number/string
    suffix?: string;    // For number/string (can often use dataPoint.unit)
    trueLabel?: string; // For boolean
    falseLabel?: string;// For boolean
    dateTimeFormat?: string; // For dateTime (e.g., 'YYYY-MM-DD HH:mm:ss')
  };
}

// --- Base Node Data ---
export interface BaseNodeData {
  label: string;
  elementType: SLDElementType;
  config?: Record<string, any>; // For element-specific static configuration
  dataPointLinks?: DataPointLink[];
  isDrillable?: boolean; // Flag for nested view capability
  subLayoutId?: string; // ID of the layout to load when drilled into
}

// --- Specific Node Data Types ---
export type CustomNodeData =
  | InverterNodeData | PanelNodeData | BreakerNodeData | MeterNodeData
  | BatteryNodeData | DataLabelNodeData | TextLabelNodeData
  | ContactorNodeData | GridNodeData | LoadNodeData | BusbarNodeData // Added new types
  | GenericDeviceNodeData;

// --- Interfaces for New Node Types ---
export interface ContactorNodeData extends BaseNodeData { elementType: SLDElementType.Contactor; }
export interface GridNodeData extends BaseNodeData { elementType: SLDElementType.Grid; }
export interface LoadNodeData extends BaseNodeData { elementType: SLDElementType.Load; }
export interface BusbarNodeData extends BaseNodeData { elementType: 'busbar'; }

// --- Existing Node Data Interfaces (ensure elementType matches) ---
export interface InverterNodeData extends BaseNodeData { elementType: SLDElementType.Inverter; }
export interface PanelNodeData extends BaseNodeData { elementType: SLDElementType.Panel; }
export interface BreakerNodeData extends BaseNodeData { elementType: SLDElementType.Breaker; }
export interface MeterNodeData extends BaseNodeData { elementType: 'meter'; }
export interface BatteryNodeData extends BaseNodeData { elementType: SLDElementType.Battery; }
export interface DataLabelNodeData extends BaseNodeData { elementType: SLDElementType.DataLabel; }
export interface TextLabelNodeData extends BaseNodeData { elementType: SLDElementType.TextLabel; text: string; }
export interface GenericDeviceNodeData extends BaseNodeData { elementType: SLDElementType.GenericDevice; icon?: string; }


// --- Edge Data ---
export interface CustomFlowEdgeData {
    label?: string;
    dataPointLinks?: DataPointLink[];
}

// --- React Flow Element Types ---
export type CustomNodeType = Node<CustomNodeData, string>;
export type CustomFlowEdge = Edge<CustomFlowEdgeData>;

// --- SLD Layout Structure ---
export interface SLDLayout {
  layoutId: string;
  nodes: CustomNodeType[];
  edges: CustomFlowEdge[];
  viewport?: { x: number; y: number; zoom: number; };
}

// --- Component Types ---
export const enum SLDElementType {
  Inverter = 'inverter', Panel = 'panel', Breaker = 'breaker', Meter = 'meter',
  Battery = 'battery', DataLabel = 'dataLabel', TextLabel = 'textLabel',
  Contactor = 'contactor', Grid = 'grid', Load = 'load', Busbar = 'busbar', // Added new types
  GenericDevice = 'genericDevice',
  // Add Transformer, Generator, PLC, Relay etc. as needed
}

export interface PaletteComponent {
  type: SLDElementType;
  label: string;
  defaultData?: Partial<CustomNodeData>;
  icon?: React.ReactNode;
}

export interface PaletteCategory {
  name: string;
  components: PaletteComponent[];
}

// --- State & Props ---
export interface SLDWidgetProps {
  layoutId: string;
  // Optional prop to handle drilling down into a sub-layout
  onNavigateToLayout?: (layoutId: string) => void;
}

export interface CurrentUser {
  id: string;
  role: 'admin' | 'operator' | 'viewer';
}

// Use the new DataPoint interface here
export interface SLDState {
  realtimeData: RealTimeData;
  dataPoints: Record<string, DataPoint>; // Use DataPoint interface
  isEditMode: boolean;
  currentUser: CurrentUser | null;
  // Actions defined in store
}