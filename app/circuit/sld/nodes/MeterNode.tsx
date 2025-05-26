// components/sld/nodes/MeterNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { MeterNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { GaugeIcon, AlertTriangleIcon, CheckCircleIcon, TerminalSquareIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const MeterNode: React.FC<NodeProps<MeterNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging } = props; // Adjusted destructuring
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Status DataPointLink Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline'; // Default status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  // --- Meter Reading DataPointLink Handling ---
  const readingDataPointLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'reading' || link.targetProperty === 'value'), 
    [data.dataPointLinks]
  );
  const readingDataPointConfig = useMemo(() => readingDataPointLink ? dataPoints[readingDataPointLink.dataPointId] : undefined, [readingDataPointLink, dataPoints]);
  const readingOpcUaNodeId = useMemo(() => readingDataPointConfig?.nodeId, [readingDataPointConfig]);
  const reactiveReadingValue = useOpcUaNodeValue(readingOpcUaNodeId);

  const meterReading = useMemo(() => {
    if (readingDataPointLink && readingDataPointConfig && reactiveReadingValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveReadingValue, readingDataPointLink);
      return formatDisplayValue(mappedValue, readingDataPointLink.format, readingDataPointConfig?.dataType);
    }
    // Fallback or static display if no DPLink for reading
    return data.config?.displayType || data.config?.meterType || 'Meter';
  }, [readingDataPointLink, readingDataPointConfig, reactiveReadingValue, data.config]);

  const statusStyles = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/10', iconColor: 'text-destructive', textColor: 'text-destructive-foreground' };
    if (processedStatus === 'warning') 
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-300' };
    if (processedStatus === 'reading' || processedStatus === 'nominal' || processedStatus === 'online') 
      return { border: 'border-sky-500', bg: 'bg-sky-500/10', iconColor: 'text-sky-500', textColor: 'text-sky-700 dark:text-sky-300' };
    // Default for offline or unknown status
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-muted/30', iconColor: 'text-muted-foreground', textColor: 'text-muted-foreground' };
  }, [processedStatus]);
  
  // --- Derived Styles DataPointLink Handling ---
  const stylingLinks = useMemo(() => {
    return data.dataPointLinks?.filter(link => 
      ['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || link.targetProperty.startsWith('--')
    ) || [];
  }, [data.dataPointLinks]);

  // Subscriptions for up to 3 dedicated styling links
  const styleLink1 = useMemo(() => stylingLinks[0], [stylingLinks]);
  const styleLink1DataPointConfig = useMemo(() => styleLink1 ? dataPoints[styleLink1.dataPointId] : undefined, [styleLink1, dataPoints]);
  const styleLink1OpcUaNodeId = useMemo(() => styleLink1DataPointConfig?.nodeId, [styleLink1DataPointConfig]);
  const reactiveStyleLink1Value = useOpcUaNodeValue(styleLink1OpcUaNodeId);

  const styleLink2 = useMemo(() => stylingLinks[1], [stylingLinks]);
  const styleLink2DataPointConfig = useMemo(() => styleLink2 ? dataPoints[styleLink2.dataPointId] : undefined, [styleLink2, dataPoints]);
  const styleLink2OpcUaNodeId = useMemo(() => styleLink2DataPointConfig?.nodeId, [styleLink2DataPointConfig]);
  const reactiveStyleLink2Value = useOpcUaNodeValue(styleLink2OpcUaNodeId);

  const styleLink3 = useMemo(() => stylingLinks[2], [stylingLinks]);
  const styleLink3DataPointConfig = useMemo(() => styleLink3 ? dataPoints[styleLink3.dataPointId] : undefined, [styleLink3, dataPoints]);
  const styleLink3OpcUaNodeId = useMemo(() => styleLink3DataPointConfig?.nodeId, [styleLink3DataPointConfig]);
  const reactiveStyleLink3Value = useOpcUaNodeValue(styleLink3OpcUaNodeId);

  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};

    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      values[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (readingOpcUaNodeId && reactiveReadingValue !== undefined) {
      values[readingOpcUaNodeId] = reactiveReadingValue;
    }

    if (styleLink1OpcUaNodeId && reactiveStyleLink1Value !== undefined) {
      values[styleLink1OpcUaNodeId] = reactiveStyleLink1Value;
    }
    if (styleLink2OpcUaNodeId && reactiveStyleLink2Value !== undefined) {
      values[styleLink2OpcUaNodeId] = reactiveStyleLink2Value;
    }
    if (styleLink3OpcUaNodeId && reactiveStyleLink3Value !== undefined) {
      values[styleLink3OpcUaNodeId] = reactiveStyleLink3Value;
    }
    return values;
  }, [
    statusOpcUaNodeId, reactiveStatusValue,
    readingOpcUaNodeId, reactiveReadingValue,
    styleLink1OpcUaNodeId, reactiveStyleLink1Value,
    styleLink2OpcUaNodeId, reactiveStyleLink2Value,
    styleLink3OpcUaNodeId, reactiveStyleLink3Value
  ]);

  const derivedNodeStyles = useMemo(() => {
    return getDerivedStyle(data, opcUaValuesForDerivedStyle, dataPoints);
  }, [data, opcUaValuesForDerivedStyle, dataPoints]);

  const StatusIcon = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if (processedStatus === 'reading' || processedStatus === 'nominal' || processedStatus === 'online') return GaugeIcon; // Or CheckCircleIcon
    return GaugeIcon; // Default icon
  }, [processedStatus]);

  // Merged styles
  const componentStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor || statusStyles.border,
    backgroundColor: derivedNodeStyles.backgroundColor || statusStyles.bg,
    color: derivedNodeStyles.color || statusStyles.textColor,
  };
  const iconFinalColor = derivedNodeStyles.color || statusStyles.iconColor; // Specific for icon if different

  return (
    <motion.div
      className={`
        sld-node meter-node group w-[80px] h-[70px] rounded-lg shadow-lg
        flex flex-col items-center justify-between p-1.5 
        border-2 
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
      style={componentStyle} // Apply merged styles: border color, bg color, text color
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, 
                type, 
                position: { x: 0, y: 0 }, // Default position as it's not available in props
                data, 
                selected, 
                dragging, 
                zIndex, 
                // width and height are not available in NodeProps
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />

      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={24} className={`my-1 transition-colors`} style={{ color: iconFinalColor }} />
      
      <p className="text-[8px] text-center truncate w-full leading-tight" title={meterReading}>
        {meterReading}
      </p>
    </motion.div>
  );
};

export default memo(MeterNode);