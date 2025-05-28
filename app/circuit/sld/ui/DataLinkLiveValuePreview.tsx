// app/circuit/sld/ui/DataLinkLiveValuePreview.tsx
import React from 'react';
import { DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue } from '../nodes/nodeUtils'; // Adjusted path
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

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

  const reactiveValue = useOpcUaNodeValue(opcUaNodeId); // Subscribe to the live value

  if (!dataPointId) {
    return null; // Don't render anything if no dataPointId is selected
  }

  if (!dataPointInfo || !opcUaNodeId) {
    return (
      <div className="mt-2 p-2 border border-dashed border-border rounded-md bg-muted/30 text-xs">
        <p className="font-medium text-muted-foreground">Live Preview:</p>
        <p className="text-destructive">Invalid DataPoint selection or missing Node ID.</p>
      </div>
    );
  }

  const isLoading = reactiveValue === undefined;

  let mappedValue: any;
  let formattedDisplayValue: string;

  if (!isLoading) {
    // Apply value mapping (if any) using a temporary DataPointLink structure
    const tempLinkForMapping: DataPointLink = {
      dataPointId: dataPointId, // Important for context if applyValueMapping needs it
      targetProperty: '', // Not strictly needed for this preview's mapping part
      valueMapping: valueMapping,
      format: format, // Pass format along
    };
    mappedValue = applyValueMapping(reactiveValue, tempLinkForMapping);
    
    // Format the (potentially mapped) value for display
    // The format object on the link (passed as `format` prop) is used
    formattedDisplayValue = formatDisplayValue(mappedValue, format, dataPointInfo.dataType);
  } else {
    mappedValue = undefined; // Or some loading placeholder
    formattedDisplayValue = ''; // Or loading placeholder
  }

  const renderValue = (label: string, value: any, showLoading: boolean = false) => {
    if (showLoading && isLoading) {
      return <Skeleton className="h-4 w-2/3" />;
    }
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground italic">N/A</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    return String(value);
  };

  return (
    <div className="mt-2 p-2.5 border border-dashed border-border/70 rounded-md bg-card shadow-sm">
      <p className="text-xs font-semibold text-primary mb-1.5">Live Data Preview:</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <p className="font-medium text-muted-foreground">Raw Value:</p>
        <div className="text-right">{renderValue('Raw', reactiveValue, true)}</div>

        <p className="font-medium text-muted-foreground">Mapped Value:</p>
        <div className="text-right">{renderValue('Mapped', mappedValue, true)}</div>
        
        <p className="font-medium text-muted-foreground">Formatted Display:</p>
        <div className="text-right font-semibold">{isLoading ? <Skeleton className="h-4 w-3/4 ml-auto" /> : formattedDisplayValue}</div>
      </div>
       {isLoading && opcUaNodeId && <p className="text-xs text-muted-foreground mt-1.5 animate-pulse text-center">Fetching live data...</p>}
       {!isLoading && reactiveValue === undefined && opcUaNodeId && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 text-center">
                Live value not currently available from OPC UA server for {opcUaNodeId}.
            </p>
        )}
    </div>
  );
};

export default React.memo(DataLinkLiveValuePreview);
