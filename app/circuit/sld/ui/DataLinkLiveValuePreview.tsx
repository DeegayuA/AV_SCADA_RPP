// app/circuit/sld/ui/DataLinkLiveValuePreview.tsx
import React from 'react';
import { DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue } from '../nodes/nodeUtils'; // Adjusted path
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils'; // For conditional class names

interface DataLinkLiveValuePreviewProps {
  dataPointId: string | undefined;
  valueMapping: DataPointLink['valueMapping'] | undefined;
  format: DataPointLink['format'] | undefined;
}

const DataLinkLiveValuePreview: React.FC<DataLinkLiveValuePreviewProps> = ({
  dataPointId,
  valueMapping,
  format,
}) => {
  const { dataPoints } = useAppStore(state => ({ dataPoints: state.dataPoints }));

  const dataPointInfo = dataPointId ? dataPoints[dataPointId] : undefined;
  const opcUaNodeId = dataPointInfo?.nodeId;

  const reactiveValue = useOpcUaNodeValue(opcUaNodeId);

  // isLoadingServerData is true if we have a node ID and are waiting for the first value from the server.
  const isLoadingServerData = opcUaNodeId !== undefined && reactiveValue === undefined;

  if (!dataPointId) {
    return null; // Don't render if no dataPointId
  }

  if (!dataPointInfo || !opcUaNodeId) {
    return (
      <div className="mt-2 p-3 border border-dashed border-destructive/60 rounded-lg bg-destructive/10 text-xs shadow-sm">
        <p className="font-semibold text-destructive-foreground mb-0.5">Live Preview Error</p>
        <p className="text-destructive-foreground/90">
          Invalid DataPoint selection or it's missing the OPC UA Node ID.
        </p>
      </div>
    );
  }

  // --- Value Processing ---
  let displayRawValue: any = reactiveValue;
  let displayFactoredValue: any;
  let displayMappedValue: any;
  let displayFormattedValue: string = '';

  // Perform calculations if reactiveValue has been received (i.e., not in initial undefined state).
  // If reactiveValue is null/undefined from server (after initial load), it will be processed as such.
  if (reactiveValue !== undefined) {
    let currentProcessingValue: any = reactiveValue;

    // 1. Apply factor from DataPoint definition
    if (
      typeof currentProcessingValue === 'number' &&
      dataPointInfo.factor !== undefined &&
      dataPointInfo.factor !== null
    ) {
      displayFactoredValue = currentProcessingValue * dataPointInfo.factor;
    } else {
      // If no factor or raw value isn't a number, factored value is the same as raw.
      displayFactoredValue = currentProcessingValue;
    }
    
    currentProcessingValue = displayFactoredValue;

    // 2. Apply value mapping (from DataPointLink configuration)
    const tempLinkForMapping: DataPointLink = {
      dataPointId: dataPointId,
      targetProperty: '', // Not strictly needed for this preview's mapping
      valueMapping: valueMapping, // Prop: valueMapping from the link
      format: format, // Prop: format from the link
    };
    displayMappedValue = applyValueMapping(currentProcessingValue, tempLinkForMapping);
    
    currentProcessingValue = displayMappedValue;

    // 3. Format for final display
    const effectiveFormatOptions: DataPointLink['format'] = { type: 'string', ...format }; // Start with Link's format and default type

    // Infer display type from DataPoint's dataType if not set in Link's format
    // This helps formatDisplayValue choose the right formatting strategy.
    if (effectiveFormatOptions.type === undefined && dataPointInfo.dataType) {
      if (['Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32', 'Byte', 'SByte', 'Int64', 'UInt64'].includes(dataPointInfo.dataType)) {
        effectiveFormatOptions.type = 'number';
      } else if (dataPointInfo.dataType === 'Boolean') {
        effectiveFormatOptions.type = 'boolean';
      } else if (dataPointInfo.dataType === 'DateTime') {
        effectiveFormatOptions.type = 'dateTime';
      }
      // Add other common inferences as needed (e.g. 'String' -> 'string')
    }

    // Fallback to DataPoint's precision/decimalPlaces if not specified in Link's format
    if (effectiveFormatOptions.precision === undefined) {
      effectiveFormatOptions.precision = dataPointInfo.precision ?? dataPointInfo.decimalPlaces;
    }
    
    displayFormattedValue = formatDisplayValue(
      currentProcessingValue,
      effectiveFormatOptions,
      dataPointInfo.dataType // Pass original dataType for context in formatDisplayValue
    );
  }
  // If reactiveValue is undefined (due to isLoadingServerData or explicit undefined from server post-load),
  // display* values will be undefined/empty string, handled by renderSimpleValue or skeleton logic below.

  // Helper to render simple values (Raw, Factored, Mapped)
  const renderSimpleValue = (value: any) => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground/70 italic">N/A</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    return String(value); // General string conversion for intermediate values
  };

  return (
    <div className="mt-2 p-3 border border-dashed border-border/80 rounded-lg bg-card shadow-sm">
      <p className="text-sm font-semibold text-primary mb-2.5">Live Data Preview</p>
      <div className="grid grid-cols-[auto,1fr] gap-x-4 text-xs items-center">
        {/* Raw Value */}
        <p className="font-medium text-muted-foreground whitespace-nowrap">Raw Value:</p>
        <div className="text-right tabular-nums text-foreground/90">
          {isLoadingServerData ? <Skeleton className="h-4 w-2/3 ml-auto" /> : renderSimpleValue(displayRawValue)}
        </div>

        {/* Factored Value */}
        <p className="font-medium text-muted-foreground whitespace-nowrap">Factored Value:</p>
        <div className="text-right tabular-nums text-foreground/90">
          {isLoadingServerData ? <Skeleton className="h-4 w-2/3 ml-auto" /> : renderSimpleValue(displayFactoredValue)}
        </div>
        
        {/* Mapped Value */}
        <p className="font-medium text-muted-foreground whitespace-nowrap">Mapped Value:</p>
        <div className="text-right tabular-nums text-foreground/90">
          {isLoadingServerData ? <Skeleton className="h-4 w-2/3 ml-auto" /> : renderSimpleValue(displayMappedValue)}
        </div>
        
        {/* Formatted Display Value (final output, emphasized) */}
        <p className="font-medium text-muted-foreground whitespace-nowrap">Formatted Display:</p>
        <div className="text-right tabular-nums font-semibold text-primary">
          {isLoadingServerData ? (
            <Skeleton className="h-4 w-3/4 ml-auto" />
          ) : (
            displayFormattedValue || <span className="text-muted-foreground/70 italic">N/A</span>
          )}
        </div>
      </div>

       {isLoadingServerData && opcUaNodeId && (
         <p className="text-xs text-muted-foreground/80 mt-3 animate-pulse text-center">
           Connecting to OPC UA Server for live data...
         </p>
       )}

       {!isLoadingServerData && reactiveValue === undefined && opcUaNodeId && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-3 text-center px-1">
                Live value currently unavailable from OPC UA server for node:
                <code className="block mt-0.5 text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono">
                    {opcUaNodeId}
                </code>
            </p>
        )}
    </div>
  );
};

export default React.memo(DataLinkLiveValuePreview);