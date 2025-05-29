// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { PanelNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { SunIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

interface ExtendedNodeProps extends Omit<NodeProps<PanelNodeData>, 'xPos' | 'yPos'> {
  // Add properties with our desired optionality
  xPos?: number;
  yPos?: number;
  width?: number;
  height?: number;
}

const PanelNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props;
  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues, // Renamed for clarity
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => 
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive Data Point Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline'; // Fallback to static status or default
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const powerOutput = useMemo(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, powerDataPointConfig?.dataType);
    }
    return data.config?.powerRatingWp ? `${data.config.powerRatingWp} Wp (rated)` : 'N/A';
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.powerRatingWp]);
  
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

  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (powerOpcUaNodeId && reactivePowerValue !== undefined) {
      primaryOpcUaValues[powerOpcUaNodeId] = reactivePowerValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, powerOpcUaNodeId, reactivePowerValue, globalOpcUaNodeValues]);

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

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);

  useEffect(() => {
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700); // Match animation duration
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
  }, [processedStatus]);


  return (
    <motion.div
      className={`
        sld-node panel-node group custom-node-hover w-[100px] h-[60px] rounded-lg shadow-lg
        flex flex-col items-center justify-center relative 
        border-2 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${statusClasses.split(' ').filter(c => c.startsWith('border-')).join(' ')} /* Keep only border from statusClasses */
        bg-card dark:bg-neutral-800 /* Base background, specific bg moved to wrapper */
      `}
      // Removed transition-all, hover:shadow-md, selected ring/shadow from here.
      // componentStyle will apply derived styles. statusClasses for border is applied.
      style={componentStyle} 
      // variants for framer-motion hover scale effect (subtle)
      variants={{ hover: { scale: isNodeEditable ? 1.02 : 1 }, initial: { scale: 1 } }}
      // whileHover="hover" // Let CSS handle hover effects via custom-node-hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {/* Handles are outside the node-content-wrapper */}
      <Handle
        type="target" 
        position={Position.Top}
        id="top_in"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !-translate-y-1/2 !rounded-full react-flow__handle-common sld-handle-style"
        title="DC Input (Optional)"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_out"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !translate-y-1/2 !rounded-full react-flow__handle-common sld-handle-style"
        title="DC Output"
      />

      {/* node-content-wrapper for selection styles and specific background */}
      <div className={`
          node-content-wrapper flex flex-col items-center justify-center w-full h-full p-1 rounded-md
          ${statusClasses.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-')).join(' ')} /* Keep bg and text from statusClasses */
          ${isRecentStatusChange ? 'animate-status-highlight' : ''}
        `}
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
                  position: { x: xPos ?? 0, y: yPos ?? 0 },
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

        {/* Node Visual Content - pointer-events-none ensures group-hover on parent works */}
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
            style={{ color: 'inherit' }} // Inherits from node-content-wrapper's text-* or derivedNodeStyles.color
          >
            {String(processedStatus).toUpperCase()}
          </p>
          <p 
            className="text-[10px] font-semibold leading-tight text-center truncate w-[90%]" 
            title={data.label}
            style={{ color: 'inherit' }} 
          >
            {data.label}
          </p>
          <p className="text-[9px] leading-none" style={{ color: 'inherit' }} title={`Power: ${powerOutput}`}>
              {powerOutput}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);