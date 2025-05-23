// components/sld/nodes/MeterNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { MeterNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { GaugeIcon, AlertTriangleIcon, CheckCircleIcon, TerminalSquareIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const MeterNode: React.FC<NodeProps<MeterNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props; // Destructure all needed props
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Changed realtimeData to opcUaNodeValues
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Changed
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'offline'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const meterReading = useMemo(() => {
    // Prioritize a 'reading' or 'value' DPLink
    const readingLink = data.dataPointLinks?.find(
      link => link.targetProperty === 'reading' || link.targetProperty === 'value'
    );
    if (readingLink && dataPoints && dataPoints[readingLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[readingLink.dataPointId];
      const rawValue = getDataPointValue(readingLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, readingLink);
      return formatDisplayValue(mappedValue, readingLink.format, dpMeta?.dataType);
    }
    // Fallback or static display if no DPLink for reading
    return data.config?.displayType || data.config?.meterType || 'Meter';
  }, [data.dataPointLinks, data.config, opcUaNodeValues, dataPoints]);


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
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

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
                id, type, position, data, selected, dragging, zIndex, width, height,
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