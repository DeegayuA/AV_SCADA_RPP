// components/sld/nodes/nodeUtils.ts
import { DataPointLink, RealTimeData, DataPoint, CustomFlowEdgeData, BaseNodeData } from '@/types/sld'; // Added DataPoint for dataType context
import { format as formatDate } from 'date-fns'; // Import date-fns for date formatting

// Helper to get a data point value safely
// Prioritizes primaryOpcUaValues if the nodeId is found there, otherwise falls back to globalOpcUaNodeValues.
export function getDataPointValue(
  internalDataPointId: string | undefined,
  allDataPoints: Record<string, DataPoint> | undefined | null,
  primaryOpcUaValues?: Record<string, string | number | boolean> | undefined | null,
  globalOpcUaNodeValues?: Record<string, string | number | boolean> | undefined | null,
): string | number | boolean | undefined {
  if (!internalDataPointId || !allDataPoints) {
    return undefined;
  }
  const dpConfig = allDataPoints[internalDataPointId];
  if (!dpConfig || !dpConfig.nodeId) {
    // console.warn(`getDataPointValue: DataPoint configuration or Node ID not found for internal ID '${internalDataPointId}'.`);
    return undefined;
  }

  const nodeId = dpConfig.nodeId;

  // Check primary (reactive) values first
  if (primaryOpcUaValues && nodeId in primaryOpcUaValues) {
    return primaryOpcUaValues[nodeId];
  }

  // Fallback to global values
  if (globalOpcUaNodeValues && nodeId in globalOpcUaNodeValues) {
    return globalOpcUaNodeValues[nodeId];
  }
  
  // console.warn(`getDataPointValue: Value for Node ID '${nodeId}' (Internal ID '${internalDataPointId}') not found in primary or global sources.`);
  return undefined;
}

// Helper to apply value mapping rules
export function applyValueMapping(rawValue: any, link: DataPointLink): any {
  if (rawValue === undefined || rawValue === null || !link.valueMapping) {
    // If no value or no mapping, check for defaultValue (which might use passthrough)
    if (link.valueMapping?.defaultValue !== undefined) {
        if (String(link.valueMapping.defaultValue).includes('{passthrough_value}')) {
            return String(link.valueMapping.defaultValue).replace('{passthrough_value}', String(rawValue !== undefined && rawValue !== null ? rawValue : '')); // Handle rawValue being undefined
        }
        return link.valueMapping.defaultValue;
    }
    return rawValue; // No mapping or value, passthrough rawValue
  }

  const { type, mapping, defaultValue } = link.valueMapping;

  try {
    for (const rule of mapping) {
      switch (type) {
        case 'exact':
          // Use String conversion for robust comparison, especially for numbers vs string numbers
          // eslint-disable-next-line eqeqeq
          if (String(rawValue) == String(rule.match)) { 
            return rule.value;
          }
          break;
        case 'boolean': {
          // Coerce rawValue to a boolean more explicitly
          const boolValue = 
            rawValue === true || 
            String(rawValue).toLowerCase() === 'true' || 
            (typeof rawValue === 'number' && rawValue !== 0) ||
            String(rawValue) === '1';

          // Expects mapping to be [{value: forTrue}, {value: forFalse}]
          if (mapping && mapping.length >= 2) {
            return boolValue ? mapping[0].value : mapping[1].value;
          } else if (mapping && mapping.length === 1 && rule.match !== undefined) { // Support for match-based boolean mapping if only one rule provided
             // eslint-disable-next-line eqeqeq
             if(String(rawValue) == String(rule.match)) return rule.value;
          }
          // If mapping is incomplete for boolean, fallback occurs below
          break;
        }
        case 'range':
          if (typeof rawValue === 'number' && 
              rawValue >= (rule.min ?? -Infinity) && 
              // For ranges, often it's min <= value < max. If inclusive max, adjust.
              // Assuming rule.max is exclusive unless it's the absolute upper bound.
              rawValue < (rule.max ?? Infinity)) { 
            return rule.value;
          }
          break;
        case 'threshold':
          // This logic assumes rules in mapping are sorted by threshold if multiple apply,
          // or that it should find any match. Your original finds highest. Let's refine.
          // If multiple thresholds can be met, this simple loop takes the first.
          // To implement "highest met threshold", it requires iterating all and comparing.
          if (typeof rawValue === 'number' && rule.threshold !== undefined && rawValue >= rule.threshold) {
            return rule.value; // Takes the first threshold match
          }
          break;
        default:
          console.warn(`applyValueMapping: Unsupported mapping type '${type}'`);
          break; // Fall through to defaultValue or passthrough
      }
    }

    // If no mapping rule matched, apply defaultValue logic
    if (defaultValue !== undefined) {
      if (String(defaultValue).includes('{passthrough_value}')) {
        return String(defaultValue).replace('{passthrough_value}', String(rawValue));
      }
      return defaultValue;
    }

    return rawValue; // Passthrough if no rules matched and no default specified

  } catch (error) {
    console.error("Error applying value mapping:", error, { rawValue, link });
    return defaultValue !== undefined ? defaultValue : rawValue; // Fallback to default or raw
  }
}

// Helper to format display values
export function formatDisplayValue(
    value: any, 
    linkFormat?: DataPointLink['format'], // Make link optional, allow direct format object
    dataTypeFromDataPoint?: DataPoint['dataType'] // Optional: Original dataType for better context
): string {
    if (value === undefined || value === null) return '-'; 

    const format: DataPointLink['format'] = linkFormat || { type: 'string' }; // Default to string type if no format options
    
    // Infer format type from dataType if not explicitly provided in format object
    let effectiveFormatType = format.type;
    if (!effectiveFormatType && dataTypeFromDataPoint) {
        const dtLower = dataTypeFromDataPoint.toLowerCase();
        if (dtLower.includes('bool')) effectiveFormatType = 'boolean';
        else if (dtLower.includes('int') || dtLower.includes('float') || dtLower.includes('double') || dtLower.includes('byte')) effectiveFormatType = 'number';
        else if (dtLower.includes('date')) effectiveFormatType = 'dateTime';
        else effectiveFormatType = 'string';
    } else if (!effectiveFormatType) {
        // Final fallback if still no type
        if (typeof value === 'boolean') effectiveFormatType = 'boolean';
        else if (typeof value === 'number') effectiveFormatType = 'number';
        else if (value instanceof Date) effectiveFormatType = 'dateTime';
        else effectiveFormatType = 'string';
    }


    try {
        switch (effectiveFormatType) {
            case 'number':
                const num = Number(value);
                if (isNaN(num)) return String(value);
                
                const options: Intl.NumberFormatOptions = {};
                if (format.precision !== undefined && Number.isFinite(format.precision)) {
                    options.minimumFractionDigits = format.precision;
                    options.maximumFractionDigits = format.precision;
                } else if (dataTypeFromDataPoint?.toLowerCase().includes('int')) { // Default no decimals for ints
                    options.minimumFractionDigits = 0;
                    options.maximumFractionDigits = 0;
                }
                // else, default browser toLocaleString precision for floats/doubles

                let formattedValue = num.toLocaleString(undefined, options);
                if (format.prefix) formattedValue = format.prefix + formattedValue;
                if (format.suffix) formattedValue = formattedValue + format.suffix;
                return formattedValue;
            
            case 'boolean':
                // Robust boolean check
                const boolValue = 
                    value === true || 
                    String(value).toLowerCase() === 'true' || 
                    (typeof value === 'number' && value !== 0 && !isNaN(value)) ||
                    String(value) === '1';
                return boolValue ? (format.trueLabel ?? 'True') : (format.falseLabel ?? 'False');
            
            case 'dateTime':
                try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return String(value); 

                    // Basic ISO format without milliseconds if no custom format pattern.
                    // For complex patterns (format.dateTimeFormat), a library like date-fns is needed.
                    // Example with toLocaleString if no specific format string:
                    if (!format.dateTimeFormat) return date.toLocaleString(); 
                    if (format.dateTimeFormat) {
                       return formatDate(date, format.dateTimeFormat);
                    }
                    console.warn("dateTimeFormat pattern usage requires a date formatting library (e.g., date-fns). Using basic ISO substring.");
                    return date.toISOString().substring(0,19).replace("T", " ");

                } catch { return String(value); }

            case 'string':
            default:
                let strValue = String(value);
                if (format.prefix) strValue = `${format.prefix}${strValue}`;
                if (format.suffix) strValue = `${format.suffix}${strValue}`;
                return strValue;
        }
    } catch (error) {
        console.error("Error formatting value:", error, { value, format, dataTypeFromDataPoint });
        return String(value);
    }
}


export interface NodeDataForStyle extends BaseNodeData { // More generic to fit various node data structures
    // This could be CustomNodeData but for this util, only dataPointLinks matters from data object
    styleConfig?: Record<string, any>; // Base style config if node has it
}


// Helper to get derived styles based on dataPointLinks
// Extended type to allow CSS custom properties
interface ExtendedCSSProperties extends React.CSSProperties {
  [key: `--${string}`]: string;
}

export function getDerivedStyle(
  data: NodeDataForStyle | CustomFlowEdgeData,
  allDataPointsMetadatas: Record<string, DataPoint>,
  primaryOpcUaValues?: Record<string, string | number | boolean> | undefined | null, // Specific reactive values from the node
  globalOpcUaNodeValues?: Record<string, string | number | boolean> | undefined | null // Global values from the store
): ExtendedCSSProperties {
  const derivedStyle: ExtendedCSSProperties = {};
  if (!data.dataPointLinks) return derivedStyle;

  data.dataPointLinks.forEach(link => {
    const dpMetadata = allDataPointsMetadatas[link.dataPointId];
    if (!dpMetadata) return;

    // Use the modified getDataPointValue to fetch value, prioritizing primaryOpcUaValues
    const rawValue = getDataPointValue(link.dataPointId, allDataPointsMetadatas, primaryOpcUaValues, globalOpcUaNodeValues);
    let targetValue = applyValueMapping(rawValue, link);

    // Further format if the targetProperty expects a string that should be formatted
    // e.g. if targetProperty is 'labelSuffix' and DPLink has a format.
    // This is advanced; for simple color/visibility, raw mappedValue is often enough.
    if (link.format && (typeof targetValue === 'number' || typeof targetValue === 'boolean')) {
        targetValue = formatDisplayValue(targetValue, link.format, dpMetadata.dataType);
    }


    if (targetValue !== undefined && targetValue !== null) {
        switch (link.targetProperty) {
            case 'fillColor': 
            case 'backgroundColor':
                derivedStyle.backgroundColor = String(targetValue); break;
            case 'strokeColor':
            case 'borderColor':
                derivedStyle.borderColor = String(targetValue); break;
            case 'textColor':
            case 'color':
                derivedStyle.color = String(targetValue); break;
            case 'visible':
            case 'visibility':
                derivedStyle.display = targetValue === 'visible' || targetValue === true || String(targetValue).toLowerCase() === 'true' || Number(targetValue) > 0 ? undefined : 'none'; // undefined uses default display (e.g. 'flex')
                break;
            case 'opacity':
                const opacityVal = parseFloat(String(targetValue));
                if(!isNaN(opacityVal)) derivedStyle.opacity = Math.max(0, Math.min(1, opacityVal));
                break;
            // Add more style properties as needed (width, height, animation related, etc.)
            // e.g., animationDuration, transform for dynamic visual effects.
            default: 
                // You could set custom CSS properties here if needed for SVGs etc.
                derivedStyle[`--${link.targetProperty}`] = String(targetValue);
                break; 
        }
    }
  });

  return derivedStyle;
}

// Helper to get derived display text or primary value based on dataPointLinks
export function getDerivedPrimaryDisplay(
    data: NodeDataForStyle | CustomFlowEdgeData,
    allDataPointsMetadatas: Record<string, DataPoint>,
    primaryOpcUaValues?: Record<string, string | number | boolean> | undefined | null,
    globalOpcUaNodeValues?: Record<string, string | number | boolean> | undefined | null,
    targetPropertyForDisplay: string = 'value'
): string | null {
    const displayLink = data.dataPointLinks?.find(link => link.targetProperty === targetPropertyForDisplay);
    if (!displayLink) return null;

    const dpMetadata = allDataPointsMetadatas[displayLink.dataPointId];
    if (!dpMetadata) return null;

    const rawValue = getDataPointValue(displayLink.dataPointId, allDataPointsMetadatas, primaryOpcUaValues, globalOpcUaNodeValues);
    const mappedValue = applyValueMapping(rawValue, displayLink);

    return formatDisplayValue(mappedValue, displayLink.format, dpMetadata.dataType);
}

// --- Text Measurement Utility ---
let sharedCanvasContext: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D {
  if (!sharedCanvasContext) {
    const canvas = document.createElement('canvas');
    // The canvas does not need to be part of the document body to get a context.
    sharedCanvasContext = canvas.getContext('2d');
  }
  if (!sharedCanvasContext) {
    // Fallback or error if context cannot be obtained (highly unlikely for 2D)
    console.error("Failed to get 2D canvas context for text measurement.");
    // Return a dummy context or throw an error
    return {
        measureText: (text: string) => ({ width: text.length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 })
    } as unknown as CanvasRenderingContext2D;
  }
  return sharedCanvasContext;
}

interface TextMeasurementOptions {
  text: string;
  fontFamily?: string;
  fontSize?: string; // e.g., '16px'
  fontWeight?: string | number; // e.g., 'bold', 700
  fontStyle?: string; // e.g., 'italic'
  padding?: string; // e.g., '5px', '5px 10px'
  lineHeightFactor?: number; // e.g., 1.2 for 120% line height
}

interface TextDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export function measureTextNode(options: TextMeasurementOptions): TextDimensions {
  const {
    text,
    fontFamily = 'Arial, sans-serif', // Default font family
    fontSize = '14px',
    fontWeight = 'normal',
    fontStyle = 'normal',
    padding: paddingString = '4px', // Default padding
    lineHeightFactor = 1.2, // Default line height
  } = options;

  const ctx = getCanvasContext();
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;

  const lines = text.split('\n');
  let maxWidth = 0;

  lines.forEach(line => {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  });
  
  // Estimate line height: use actualBoundingBoxAscent/Descent if available and reliable,
  // otherwise, fallback to fontSize * lineHeightFactor.
  // For simplicity and broader compatibility, we'll use fontSize for height calculation per line.
  const numericFontSize = parseFloat(fontSize); // Assuming fontSize is like '16px'
  if (isNaN(numericFontSize)) {
      console.warn(`measureTextNode: Invalid fontSize '${fontSize}'. Defaulting to 14px for height calc.`);
  }
  const singleLineHeight = (isNaN(numericFontSize) ? 14 : numericFontSize) * lineHeightFactor;
  const totalTextHeight = lines.length * singleLineHeight;

  // Parse padding
  const paddingValues = (paddingString || '0').split(' ').map(p => parseFloat(p));
  let parsedPadding = { top: 0, right: 0, bottom: 0, left: 0 };

  if (paddingValues.length === 1) {
    parsedPadding = { top: paddingValues[0], right: paddingValues[0], bottom: paddingValues[0], left: paddingValues[0] };
  } else if (paddingValues.length === 2) {
    parsedPadding = { top: paddingValues[0], right: paddingValues[1], bottom: paddingValues[0], left: paddingValues[1] };
  } else if (paddingValues.length === 3) { // top, horizontal, bottom
    parsedPadding = { top: paddingValues[0], right: paddingValues[1], bottom: paddingValues[2], left: paddingValues[1] };
  } else if (paddingValues.length === 4) { // top, right, bottom, left
    parsedPadding = { top: paddingValues[0], right: paddingValues[1], bottom: paddingValues[2], left: paddingValues[3] };
  }
  
  // Validate parsed padding, default to 0 if NaN
  Object.keys(parsedPadding).forEach(key => {
    const k = key as keyof typeof parsedPadding;
    if (isNaN(parsedPadding[k])) parsedPadding[k] = 0;
  });


  return {
    width: maxWidth + parsedPadding.left + parsedPadding.right,
    height: totalTextHeight + parsedPadding.top + parsedPadding.bottom,
    padding: parsedPadding,
  };
}

// === NEW FUNCTIONS FOR STANDARDIZED STYLING ===

import {
  Zap,
  ZapOff,
  AlertTriangle,
  XCircle,
  Info as InfoIcon,
  LucideIcon,
  Sun, // For Panel Producing
  Moon, // For Panel Idle Night
  BatteryCharging as BatteryChargingIcon,
  BatteryFull as BatteryFullIcon,
  BatteryMedium as BatteryMediumIcon,
  BatteryLow as BatteryLowIcon,
  BatteryWarning as BatteryWarningIcon,
  MinusCircle, // For generic "off" or low states
  Gauge, // For GaugeNode default state
  TabletsIcon, // For MeterNode
  CircleDotIcon, // For Contactor Closed
  CircleIcon as OpenCircleIcon, // For Contactor Open (aliased to avoid conflict if CircleIcon is used generally)
} from 'lucide-react';

/**
 * Determines a standardized state string based on various inputs.
 * This helps decouple raw data from styling decisions.
 */
export function getStandardNodeState(
  processedStatus?: string | null, // Generic status string from data links or props
  isEnergized?: boolean | null,    // Common for electrical components
  isOpen?: boolean | null,         // For breakers, contactors, fuses
  customState?: string | null,      // Allow overriding with a specific state if needed
  panelOutputState?: 'PRODUCING_HIGH' | 'PRODUCING_MEDIUM' | 'PRODUCING_LOW' | 'IDLE_DAY' | 'IDLE_NIGHT' | null,
  batteryAction?: 'CHARGING' | 'DISCHARGING' | 'IDLE' | null,
  socPercent?: number | null
): string {
  if (customState) return customState.toUpperCase();

  const statusUpper = processedStatus?.toUpperCase();

  // Prioritize critical statuses from direct input or SoC
  if (statusUpper === 'FAULT' || statusUpper === 'TRIPPED' || statusUpper === 'ALARM') return 'FAULT';
  if (socPercent !== null && socPercent !== undefined && socPercent < 10) return 'FAULT_VERY_LOW_SOC'; // Critical SoC
  if (statusUpper === 'WARNING' || statusUpper === 'WARN') return 'WARNING';
  if (socPercent !== null && socPercent !== undefined && socPercent < 20) return 'WARNING_LOW_SOC'; // Warning SoC

  // Handle panel-specific states next
  if (panelOutputState) return panelOutputState;

  // Handle battery-specific states
  if (batteryAction) {
    if (batteryAction === 'CHARGING') return 'CHARGING';
    if (batteryAction === 'DISCHARGING') return 'DISCHARGING';
    // If IDLE, might fall through to general standby/nominal or be specific
    if (batteryAction === 'IDLE') return 'IDLE_BATTERY';
  }

  if (statusUpper === 'FAULT' || statusUpper === 'TRIPPED' || statusUpper === 'ALARM') return 'FAULT';
  if (statusUpper === 'WARNING' || statusUpper === 'WARN') return 'WARNING';
  if (statusUpper === 'OFFLINE' || statusUpper === 'UNAVAILABLE' || statusUpper === 'DISABLED') return 'OFFLINE';
  if (statusUpper === 'STANDBY' || statusUpper === 'IDLE') return 'STANDBY';

  // For elements with open/closed states (like breakers)
  if (isOpen !== null && isOpen !== undefined) {
    if (isEnergized === false && !statusUpper) return 'DEENERGIZED_OPEN'; // Explicitly de-energized and open
    if (isEnergized === true && isOpen === false) return 'ENERGIZED_CLOSED'; // Common nominal state for closed breaker
    if (isEnergized === true && isOpen === true) return 'ENERGIZED_OPEN';
    if (isEnergized === false && isOpen === false) return 'DEENERGIZED_CLOSED'; // Might be de-energized but ready
    return isOpen ? 'NOMINAL_OPEN' : 'NOMINAL_CLOSED'; // Fallback based on open state if energized is ambiguous
  }

  // For elements primarily defined by energization
  if (isEnergized === true) return 'ENERGIZED';
  if (isEnergized === false) return 'DEENERGIZED'; // Explicitly de-energized

  if (statusUpper === 'NOMINAL' || statusUpper === 'NORMAL' || statusUpper === 'OK' || statusUpper === 'RUNNING' || statusUpper === 'ACTIVE') return 'NOMINAL';

  return 'UNKNOWN'; // Default if no other state matches
}

export interface NodeAppearance {
  icon: LucideIcon;
  iconColorVar: string;
  borderColorVar: string;
  textColorVar: string;       // For primary label text
  statusTextColorVar: string; // For status text, potentially different from main label
  glowColorVar?: string;      // For glow effects, uses main status color if not specified
  mainStatusColorVar: string; // The primary color representing the status (e.g., for backgrounds, main icon fill if not iconColorVar)
  armColorVar?: string;       // Specific for breaker arm, defaults to iconColorVar
}

/**
 * Returns an appearance object based on the standardized state.
 * Contains LucideIcon component and CSS variable strings for colors.
 */
export function getNodeAppearanceFromState(standardState: string, elementType?: string): NodeAppearance {
  // Default to light theme text on status for now, can be adjusted if needed
  const defaultTextOnStatus = 'var(--sld-color-text-on-status)';
  const defaultNodeText = 'var(--sld-color-text)';
  const SLDElementTypeMeter = 'meter';
  const SLDElementTypeContactor = 'contactor';
  const SLDElementTypeFuse = 'fuse';

  switch (standardState) {
    // Panel Specific States
    case 'PRODUCING_HIGH':
      return {
        icon: Sun,
        iconColorVar: 'var(--sld-color-energized)', // Bright green or yellow
        borderColorVar: 'var(--sld-color-energized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-energized)',
        glowColorVar: 'var(--sld-color-energized)', // Consider a yellow/gold glow for sun
        mainStatusColorVar: 'var(--sld-color-energized)',
      };
    case 'PRODUCING_MEDIUM': // Could use a slightly less intense color or same as high
      return {
        icon: Sun,
        iconColorVar: 'var(--sld-color-nominal)', // Use nominal green
        borderColorVar: 'var(--sld-color-nominal)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-nominal)',
        glowColorVar: 'var(--sld-color-nominal)',
        mainStatusColorVar: 'var(--sld-color-nominal)',
      };
    case 'PRODUCING_LOW':
      return {
        icon: Sun, // Could be a dimmer sun icon if available, or MinusCircle
        iconColorVar: 'var(--sld-color-standby)', // A less active color like standby blue/gray
        borderColorVar: 'var(--sld-color-standby)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-standby)',
        mainStatusColorVar: 'var(--sld-color-standby)',
      };
    case 'IDLE_DAY': // Daytime, but no production (e.g. cloudy, or panel okay but system needs no power)
      return {
        icon: Sun, // Still sun, but colors indicate inactivity
        iconColorVar: 'var(--sld-color-deenergized)',
        borderColorVar: 'var(--sld-color-deenergized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-deenergized)',
        mainStatusColorVar: 'var(--sld-color-deenergized)',
      };
    case 'IDLE_NIGHT': // Night time
      return {
        icon: Moon,
        iconColorVar: 'var(--sld-color-standby)',
        borderColorVar: 'var(--sld-color-standby)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-standby)',
        mainStatusColorVar: 'var(--sld-color-standby)',
      };
    case 'DATA_DISPLAY':
      return {
        icon: elementType === SLDElementTypeMeter ? TabletsIcon : Gauge,
        iconColorVar: 'var(--sld-color-accent)',
        borderColorVar: 'var(--sld-color-deenergized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-text-muted)',
        mainStatusColorVar: 'var(--sld-color-accent)',
      };

    // Battery Specific States
    case 'CHARGING':
      return {
        icon: BatteryChargingIcon,
        iconColorVar: 'var(--sld-color-standby)', // Blue for charging
        borderColorVar: 'var(--sld-color-standby)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-standby)',
        glowColorVar: 'var(--sld-color-standby)',
        mainStatusColorVar: 'var(--sld-color-standby)',
      };
    case 'DISCHARGING':
      return {
        icon: Zap, // Using Zap for active power discharge, similar to ENERGIZED
        iconColorVar: 'var(--sld-color-energized)',
        borderColorVar: 'var(--sld-color-energized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-energized)',
        glowColorVar: 'var(--sld-color-energized)',
        mainStatusColorVar: 'var(--sld-color-energized)',
      };
    case 'IDLE_BATTERY': // Battery is idle/standby
        return {
          icon: BatteryMediumIcon, // Or just BatteryIcon if available
          iconColorVar: 'var(--sld-color-nominal)', // Nominal color but not actively charging/discharging
          borderColorVar: 'var(--sld-color-nominal)',
          textColorVar: defaultNodeText,
          statusTextColorVar: 'var(--sld-color-nominal)',
          mainStatusColorVar: 'var(--sld-color-nominal)',
        };
    case 'WARNING_LOW_SOC':
      return {
        icon: BatteryWarningIcon,
        iconColorVar: 'var(--sld-color-warning)',
        borderColorVar: 'var(--sld-color-warning)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-warning)',
        glowColorVar: 'var(--sld-color-warning)',
        mainStatusColorVar: 'var(--sld-color-warning)',
      };
    case 'FAULT_VERY_LOW_SOC': // This is a critical fault due to very low SoC
      return {
        icon: BatteryWarningIcon, // Could also be XCircle
        iconColorVar: 'var(--sld-color-fault)',
        borderColorVar: 'var(--sld-color-fault)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-fault)',
        glowColorVar: 'var(--sld-color-fault)',
        mainStatusColorVar: 'var(--sld-color-fault)',
      };

    // General States (from previous implementation)
    case 'FAULT':
      return {
        icon: XCircle,
        iconColorVar: 'var(--sld-color-fault)',
        borderColorVar: 'var(--sld-color-fault)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-fault)',
        glowColorVar: 'var(--sld-color-fault)',
        mainStatusColorVar: 'var(--sld-color-fault)',
      };
    case 'WARNING':
      return {
        icon: AlertTriangle,
        iconColorVar: 'var(--sld-color-warning)',
        borderColorVar: 'var(--sld-color-warning)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-warning)',
        glowColorVar: 'var(--sld-color-warning)',
        mainStatusColorVar: 'var(--sld-color-warning)',
      };
    case 'OFFLINE':
    case 'DEENERGIZED':
    case 'DEENERGIZED_OPEN': // Breaker specific
    case 'DEENERGIZED_CLOSED': // Breaker specific
      return {
        icon: ZapOff,
        iconColorVar: 'var(--sld-color-deenergized)',
        borderColorVar: 'var(--sld-color-deenergized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-deenergized)',
        mainStatusColorVar: 'var(--sld-color-deenergized)',
        armColorVar: 'var(--sld-color-deenergized)', // For breaker
      };
    case 'STANDBY':
      return {
        icon: InfoIcon,
        iconColorVar: 'var(--sld-color-standby)',
        borderColorVar: 'var(--sld-color-standby)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-standby)',
        mainStatusColorVar: 'var(--sld-color-standby)',
      };
    case 'ENERGIZED': // General energized state
    case 'NOMINAL':   // General nominal state
    case 'ENERGIZED_CLOSED':
    case 'NOMINAL_CLOSED':
      {
        let icon = Zap;
        if (elementType === SLDElementTypeMeter) icon = TabletsIcon;
        else if (elementType === SLDElementTypeContactor) icon = CircleDotIcon;
        else if (elementType === SLDElementTypeFuse) icon = MinusCircle; // Intact fuse
        return {
          icon: icon,
        iconColorVar: 'var(--sld-color-energized)',
        borderColorVar: 'var(--sld-color-energized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-energized)',
        mainStatusColorVar: 'var(--sld-color-energized)',
        armColorVar: 'var(--sld-color-energized)', // For breaker
      };
    case 'ENERGIZED_OPEN':
    case 'NOMINAL_OPEN':
      return {
        icon: elementType === SLDElementTypeContactor ? OpenCircleIcon : (elementType === SLDElementTypeFuse ? MinusCircle : ZapOff), // Intact but open fuse (if possible state)
        iconColorVar: 'var(--sld-color-nominal)',
        borderColorVar: 'var(--sld-color-nominal)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-nominal)',
        mainStatusColorVar: 'var(--sld-color-nominal)',
        armColorVar: 'var(--sld-color-deenergized)',
      };
    case 'DEENERGIZED_OPEN':
      return {
        icon: elementType === SLDElementTypeContactor ? OpenCircleIcon : (elementType === SLDElementTypeFuse ? MinusCircle : ZapOff), // Intact but de-energized fuse (if open is possible for fuse)
        iconColorVar: 'var(--sld-color-deenergized)',
        borderColorVar: 'var(--sld-color-deenergized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-deenergized)',
        mainStatusColorVar: 'var(--sld-color-deenergized)',
        armColorVar: 'var(--sld-color-deenergized)',
      };
    case 'UNKNOWN':
    default:
      return {
        icon: InfoIcon,
        iconColorVar: 'var(--sld-color-deenergized)', // Default to a neutral/offline look
        borderColorVar: 'var(--sld-color-deenergized)',
        textColorVar: defaultNodeText,
        statusTextColorVar: 'var(--sld-color-deenergized)',
        mainStatusColorVar: 'var(--sld-color-deenergized)',
      };
  }
}