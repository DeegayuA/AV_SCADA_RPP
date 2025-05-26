// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { PanelNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { SunIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface ExtendedNodeProps extends Omit<NodeProps<PanelNodeData>, 'xPos' | 'yPos'> {
  // Add properties with our desired optionality
  xPos?: number;
  yPos?: number;
  width?: number;
  height?: number;
}

const PanelNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props;
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
    return data.status || 'offline'; // Fallback to static status or default
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const powerOutput = useMemo(() => {
    const powerLink = data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput');
    if (powerLink && dataPoints && dataPoints[powerLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[powerLink.dataPointId];
      const rawValue = getDataPointValue(powerLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, dpMeta?.dataType);
    }
    return data.config?.powerRatingWp ? `${data.config.powerRatingWp} Wp (rated)` : 'N/A';
  }, [data.dataPointLinks, data.config?.powerRatingWp, opcUaNodeValues, dataPoints]);
  
  // Determine status-based styling
  const statusClasses = useMemo(() => {
    switch (processedStatus) {
      case 'alarm':
      case 'fault':
        return 'border-destructive dark:border-red-400 bg-destructive/10 dark:bg-red-900/20 text-destructive-foreground';
      case 'warning':
        return 'border-yellow-500 dark:border-yellow-400 bg-yellow-500/10 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      case 'nominal':
      case 'producing':
      case 'online':
        return 'border-green-600 dark:border-green-500 bg-green-600/5 dark:bg-green-900/10 text-green-700 dark:text-green-300';
      default: // Default for 'offline', 'standby' or unknown
        return 'border-neutral-500 dark:border-neutral-600 bg-neutral-500/10 dark:bg-neutral-900/20 text-neutral-700 dark:text-neutral-300';
    }
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

  const StatusIcon = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon; 
    return SunIcon; // SunIcon for producing, nominal, online, or even offline (color will change)
  }, [processedStatus]);

  const iconColor = useMemo(() => {
    if (derivedNodeStyles.color) return derivedNodeStyles.color; 
    if (processedStatus === 'producing' || processedStatus === 'nominal' || processedStatus === 'online') return 'text-yellow-500 dark:text-yellow-400';
    if (processedStatus === 'fault' || processedStatus === 'alarm') return 'text-destructive dark:text-red-400';
    if (processedStatus === 'warning') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-400 dark:text-gray-500'; 
  }, [processedStatus, derivedNodeStyles.color]);

  const isProducing = useMemo(() => {
    // A simple heuristic: if powerOutput is not "N/A" and not "0 W" (or similar zero values)
    // This might need refinement based on actual formatted values from formatDisplayValue
    if (powerOutput === 'N/A') return false;
    const numericValue = parseFloat(powerOutput); // Extracts leading number
    return !isNaN(numericValue) && numericValue > 0;
  }, [powerOutput]);


  // Merged styles for the main div
  const componentStyle: React.CSSProperties = {
    ...derivedNodeStyles, // Apply all derived styles
    // Explicitly override border and background if not set by derived styles, to ensure statusClasses apply
    borderColor: derivedNodeStyles.borderColor || undefined, // Let className handle if not in derived
    backgroundColor: derivedNodeStyles.backgroundColor || undefined, // Let className handle
    color: derivedNodeStyles.color || undefined, // Let className handle
  };


  return (
    <motion.div
      className={`
        sld-node panel-node group w-[100px] h-[60px] rounded-lg shadow-lg
        flex flex-col items-center justify-center p-1 
        border-2 relative 
        bg-card dark:bg-neutral-800 
        transition-all duration-200 ease-in-out
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-900 shadow-primary/30' : 
          selected ? 'ring-1 ring-accent ring-offset-1 dark:ring-offset-neutral-900 shadow-accent/20' : 
          'hover:shadow-md'} 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${statusClasses} 
      `}
      style={componentStyle}
      variants={{ 
        hover: { 
          scale: isNodeEditable ? 1.04 : 1, 
          boxShadow: isNodeEditable ? "0px 5px 15px rgba(0,0,0,0.1)" : "0px 2px 8px rgba(0,0,0,0.07)" 
        }, 
        initial: { scale: 1 } 
      }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 350, damping: 12 }}
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
                position: { x: xPos ?? 0, y: yPos ?? 0 }, // Use xPos, yPos for position
                data, 
                selected, 
                dragging, 
                zIndex, 
                width, 
                height, 
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* --- TOP HANDLE (TARGET - INPUT) --- */}
      <Handle
        type="target" 
        position={Position.Top}
        id="top_in" // Unique ID for this handle on the node
        isConnectable={isConnectable}
        className={`
          !w-3 !h-3 !-translate-y-1/2 !rounded-full
          !bg-slate-300 dark:!bg-slate-600 
          border-2 !border-slate-400 dark:!border-slate-500
          group-hover:!opacity-100 group-hover:!bg-sky-500 dark:group-hover:!bg-sky-400 group-hover:!border-sky-600 dark:group-hover:!border-sky-500
          transition-all duration-150 ease-in-out
          ${isNodeEditable && selected ? '!opacity-100 !bg-sky-400' : !isNodeEditable ? '!opacity-30' : '!opacity-0'} 
          react-flow__handle-common 
        `}
        title="DC Input (Optional)"
      />

      {/* --- BOTTOM HANDLE (SOURCE - OUTPUT) --- */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_out" // Unique ID for this handle on the node
        isConnectable={isConnectable}
        className={`
          !w-3 !h-3 !translate-y-1/2 !rounded-full
          !bg-slate-300 dark:!bg-slate-600 
          border-2 !border-slate-400 dark:!border-slate-500
          group-hover:!opacity-100 group-hover:!bg-amber-500 dark:group-hover:!bg-amber-400 group-hover:!border-amber-600 dark:group-hover:!border-amber-500
          transition-all duration-150 ease-in-out
           ${isNodeEditable && selected ? '!opacity-100 !bg-amber-400' : !isNodeEditable ? '!opacity-30' : '!opacity-0'}
          react-flow__handle-common
        `}
        title="DC Output"
      />

      {/* Node Visual Content */}
      <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
        <motion.div
          animate={isProducing && StatusIcon === SunIcon ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : {}}
          transition={isProducing && StatusIcon === SunIcon ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          <StatusIcon 
              size={22} 
              className={`mb-0.5 transition-colors duration-300 ${iconColor}`} 
          />
        </motion.div>
        <p 
          className="text-[9px] font-medium leading-tight text-center truncate w-[90%]" 
          title={`Status: ${processedStatus}`}
          style={{ color: 'inherit' }}
        >
          {String(processedStatus).toUpperCase()}
        </p>
        <p 
          className="text-[10px] font-semibold leading-tight text-center truncate w-[90%]" 
          title={data.label}
          style={{ color: 'inherit' }} // Inherit color from statusClasses or derivedNodeStyles.color
        >
          {data.label}
        </p>
        <p className="text-[9px] leading-none" style={{ color: 'inherit' }} title={`Power: ${powerOutput}`}>
            {powerOutput}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);