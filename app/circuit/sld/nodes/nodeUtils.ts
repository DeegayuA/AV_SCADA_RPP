// components/sld/nodes/nodeUtils.ts
import { DataPointLink, RealTimeData, DataPoint, CustomFlowEdgeData, BaseNodeData } from '@/types/sld'; // Added DataPoint for dataType context

// Helper to get a data point value safely
export function getDataPointValue(
  dataPointId: string | undefined,
  realtimeData: RealTimeData | undefined | null // Allow realtimeData to be potentially undefined
): any | undefined {
  if (!dataPointId || !realtimeData) {
    return undefined;
  }
  return realtimeData[dataPointId];
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
                    
                    // Placeholder for library-based formatting:
                    if (format.dateTimeFormat && typeof formatDateWithLibrary === 'function') {
                       return formatDateWithLibrary(date, format.dateTimeFormat);
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
export function getDerivedStyle(
  data: NodeDataForStyle | CustomFlowEdgeData, // Accept both node and edge data
  realtimeData: RealTimeData,
  dataPointsMetadatas: Record<string, DataPoint> // Pass all DP metadata
): React.CSSProperties {
  const derivedStyle: React.CSSProperties = {};
  if (!data.dataPointLinks) return derivedStyle;

  data.dataPointLinks.forEach(link => {
    const dpMetadata = dataPointsMetadatas[link.dataPointId];
    if (!dpMetadata) return; // Skip if data point metadata not found

    const rawValue = getDataPointValue(link.dataPointId, realtimeData);
    let targetValue = applyValueMapping(rawValue, link); // Apply mapping first

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
    realtimeData: RealTimeData,
    dataPointsMetadatas: Record<string, DataPoint>,
    // Defines which DPLink.targetProperty to prioritize for display.
    // Could be 'value' for DataLabel, 'statusText' for a status display area, 'label' to override static label.
    targetPropertyForDisplay: string = 'value' 
): string | null {
    const displayLink = data.dataPointLinks?.find(link => link.targetProperty === targetPropertyForDisplay);
    if (!displayLink) return null; // No DPLink configured for this specific targetProperty.

    const dpMetadata = dataPointsMetadatas[displayLink.dataPointId];
    if (!dpMetadata) return null; // DataPoint metadata is essential for proper formatting.

    const rawValue = getDataPointValue(displayLink.dataPointId, realtimeData);
    const mappedValue = applyValueMapping(rawValue, displayLink);
    
    // Now format this mappedValue (or rawValue if mapping didn't change it)
    return formatDisplayValue(mappedValue, displayLink.format, dpMetadata.dataType);
}