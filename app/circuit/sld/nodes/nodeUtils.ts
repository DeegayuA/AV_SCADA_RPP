// components/sld/nodes/nodeUtils.ts
import { DataPointLink, RealTimeData } from '@/types/sld';

// Helper to get a data point value safely
export function getDataPointValue(
  dataPointId: string | undefined,
  realtimeData: RealTimeData
): any | undefined {
  return dataPointId ? realtimeData[dataPointId] : undefined;
}

// Helper to apply value mapping rules
export function applyValueMapping(value: any, link: DataPointLink): any {
  if (value === undefined || !link.valueMapping) {
    return link.valueMapping?.defaultValue;
  }

  const { type, mapping, defaultValue } = link.valueMapping;

  try {
    switch (type) {
      case 'exact':
        const exactMatch = mapping.find((m: { match: any }) => m.match === value);
        return exactMatch ? exactMatch.value : defaultValue;
      case 'boolean': {
        // Ensure value is treated as boolean
        const boolValue = Boolean(value) && value !== 'false' && value !== '0';
        const boolMapping = mapping as unknown as { trueValue: any, falseValue: any };
        return boolValue ? boolMapping.trueValue : boolMapping.falseValue;
      }
      case 'range':
        const rangeMatch = mapping.find((m: { min: number, max: number }) => value >= m.min && value < m.max);
        return rangeMatch ? rangeMatch.value : defaultValue;
      case 'threshold':
         // Find highest threshold that value meets/exceeds
         let thresholdValue = defaultValue;
         let currentThreshold = -Infinity;
         mapping.forEach((m: { threshold: number, value: any }) => {
            if (value >= m.threshold && m.threshold >= currentThreshold) {
                thresholdValue = m.value;
                currentThreshold = m.threshold;
            }
         });
         return thresholdValue;
      default:
        return defaultValue;
    }
  } catch (error) {
    console.error("Error applying value mapping:", error, { value, link });
    return defaultValue;
  }
}

// Helper to format display values
export function formatDisplayValue(value: any, link: DataPointLink): string {
    if (value === undefined || value === null) return '-'; // Or empty string?

    const { format } = link;
    if (!format) return String(value);

    try {
        switch (format.type) {
            case 'number':
                const num = Number(value);
                if (isNaN(num)) return String(value); // Fallback if not a number
                const options: Intl.NumberFormatOptions = {};
                if (format.precision !== undefined) {
                    options.minimumFractionDigits = format.precision;
                    options.maximumFractionDigits = format.precision;
                }
                let formattedValue = num.toLocaleString(undefined, options);
                if (format.prefix) formattedValue = format.prefix + formattedValue;
                if (format.suffix) formattedValue = formattedValue + format.suffix;
                return formattedValue;
            case 'boolean':
                const boolValue = Boolean(value) && value !== 'false' && value !== '0';
                return boolValue ? (format.trueLabel ?? 'True') : (format.falseLabel ?? 'False');
            default:
                return String(value);
        }
    } catch (error) {
        console.error("Error formatting value:", error, { value, link });
        return String(value); // Fallback
    }
}

// Helper to get derived styles based on dataPointLinks
export function getDerivedStyle(
  data: { dataPointLinks?: DataPointLink[] },
  realtimeData: RealTimeData
): React.CSSProperties {
  const derivedStyle: React.CSSProperties = {};
  if (!data.dataPointLinks) return derivedStyle;

  data.dataPointLinks.forEach(link => {
    const value = getDataPointValue(link.dataPointId, realtimeData);
    let targetValue = value;

    if (link.valueMapping) {
      targetValue = applyValueMapping(value, link);
    }

    if (targetValue !== undefined) {
        // Basic mapping - refine as needed (e.g., camelCase CSS properties)
        if (link.targetProperty === 'fillColor') derivedStyle.backgroundColor = targetValue;
        if (link.targetProperty === 'strokeColor') derivedStyle.borderColor = targetValue;
        if (link.targetProperty === 'visible') derivedStyle.display = targetValue === 'visible' || targetValue === true ? 'block' : 'none';
        // Add more mappings: textColor -> color, animationSpeed -> animationDuration etc.
    }
  });

  return derivedStyle;
}

// Helper to get derived display text based on dataPointLinks
export function getDerivedDisplayText(
    data: { dataPointLinks?: DataPointLink[] },
    realtimeData: RealTimeData,
    targetPropertyValue: string = 'value' // Target property to look for (e.g., 'value', 'statusText')
): string | null {
    const displayLink = data.dataPointLinks?.find(link => link.targetProperty === targetPropertyValue);
    if (!displayLink) return null;

    const value = getDataPointValue(displayLink.dataPointId, realtimeData);
    let displayValue: any = value; // Use raw value if no mapping/formatting

    if (displayLink.valueMapping) {
        displayValue = applyValueMapping(value, displayLink);
    }

    // Only format if the result isn't already mapped to a specific string (like 'ON'/'OFF')
    // or if the mapping itself produced the value to be formatted.
    // This logic might need refinement based on exact use cases.
    const shouldFormat = displayLink.format && (displayValue === value || typeof displayValue === 'number' || typeof displayValue === 'boolean');

    if (shouldFormat && displayLink.format) {
         return formatDisplayValue(displayValue, displayLink);
    } else {
         return displayValue !== undefined && displayValue !== null ? String(displayValue) : '-';
    }
}