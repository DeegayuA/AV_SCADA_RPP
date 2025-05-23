// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BreakerNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { ZapOffIcon, ZapIcon, ShieldAlertIcon, ShieldCheckIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props; // Destructure all needed props
  const { isEditMode, currentUser, realtimeData, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    realtimeData: state.realtimeData,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // Determine breaker status from DataPointLinks or fallback to data.status
  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints[statusLink.dataPointId] && realtimeData) {
      const rawValue = getDataPointValue(statusLink.dataPointId, realtimeData);
      // Ensure applyValueMapping can handle various types, including boolean if status is directly represented
      return applyValueMapping(rawValue, statusLink); 
    }
    // Fallback to static status if no DPLink for 'status' or data not available
    return data.status; 
  }, [data.dataPointLinks, data.status, realtimeData, dataPoints]);
  
  // Determine if the breaker is open based on processedStatus or config
  const isOpen = useMemo(() => {
    // Prefer a DataPointLink for 'isOpen' if available
    const isOpenLink = data.dataPointLinks?.find(link => link.targetProperty === 'isOpen');
    if (isOpenLink && dataPoints[isOpenLink.dataPointId] && realtimeData) {
      const rawValue = getDataPointValue(isOpenLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, isOpenLink);
      // Interpret various "true" conditions for isOpen
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus or data.config
    return processedStatus === 'open' || (data.config?.normallyOpen && processedStatus !== 'closed');
  }, [data.dataPointLinks, data.config?.normallyOpen, processedStatus, realtimeData, dataPoints]);

  const statusStyles = useMemo(() => {
    let currentStatus = processedStatus; // Use the processed status

    if (currentStatus === 'fault' || currentStatus === 'tripped' || currentStatus === 'alarm') {
      return { border: 'border-destructive dark:border-red-500', bg: 'bg-destructive/10 dark:bg-red-900/30', iconColor: 'text-destructive dark:text-red-400', main: 'text-destructive dark:text-red-400' };
    }
    if (currentStatus === 'warning') {
      return { border: 'border-yellow-500 dark:border-yellow-400', bg: 'bg-yellow-500/10 dark:bg-yellow-900/30', iconColor: 'text-yellow-500 dark:text-yellow-400', main: 'text-yellow-600 dark:text-yellow-400' };
    }
    // Consider 'closed' implies energized/nominal unless specified otherwise by another DPLink
    if (!isOpen && (currentStatus === 'closed' || currentStatus === 'nominal' || currentStatus === 'energized')) {
      return { border: 'border-green-600 dark:border-green-500', bg: 'bg-green-600/10 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-500', main: 'text-green-700 dark:text-green-500' };
    }
    // Default for 'open', 'offline', or undefined status
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-neutral-200/20 dark:bg-neutral-700/30', iconColor: 'text-neutral-500 dark:text-neutral-400', main: 'text-neutral-600 dark:text-neutral-400' };
  }, [processedStatus, isOpen]);

  // Get additional styles from dataPointLinks (e.g., for custom colors based on other data)
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );
  
  // Combine statusStyles with derivedNodeStyles. Derived styles can override.
  // For simplicity, we'll focus on className-based statusStyles and let derivedNodeStyles apply inline.
  // More complex merging might be needed if derivedNodeStyles also return classNames.

  const breakerTypeLabel = data.config?.type || 'Breaker';

  // Choose icon based on status - can be expanded with more DPLinks
  const StatusIcon = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'tripped') return ShieldAlertIcon;
    if (processedStatus === 'alarm') return AlertTriangleIcon; // Specific alarm icon
    if (processedStatus === 'warning') return AlertTriangleIcon; // Or a dedicated warning icon
    if (!isOpen && (processedStatus === 'closed' || processedStatus === 'nominal' || processedStatus === 'energized')) return ShieldCheckIcon; // Indicates closed and healthy
    if (isOpen) return ZapOffIcon; // Clearly open
    return ZapIcon; // Default or unknown state icon (could also be ZapOffIcon if default is open)
  }, [processedStatus, isOpen]);


  return (
    <motion.div
      className={`
        sld-node breaker-node group w-[70px] h-[90px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1.5 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      style={derivedNodeStyles} // Apply derived styles here
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
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

      <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" style={{ color: derivedNodeStyles.color || statusStyles.main }} title={`${data.label} (${breakerTypeLabel})`}>
        {data.label}
      </p>
      
      {/* SVG Breaker Symbol or Status Icon */}
      {/* Option 1: Keep SVG and change its state */}
      <motion.svg 
        viewBox="0 0 24 24" 
        width="32" height="32" 
        className={`flex-grow`} 
        style={{ color: derivedNodeStyles.color || statusStyles.iconColor }}
        initial={false} // Prevent initial animation on mount
      >
        <circle cx="12" cy="7" r="2.5" fill="currentColor" /> {/* Top terminal */}
        <circle cx="12" cy="17" r="2.5" fill="currentColor" /> {/* Bottom terminal */}
        <line x1="12" y1="9.5" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1.5" /> {/* Vertical bar */}
        
        {/* Switch arm: using motion.line for smooth transition */}
        <motion.line
          key={isOpen ? "open-arm" : "closed-arm"} // Key change helps React trigger animation correctly
          x1="12"
          y1="12"
          initial={false} // Start from current state if already rendered
          animate={isOpen ? { x2: 18, y2: 8 } : { x2: 12, y2: 9.5 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        <rect x="8" y="11" width="8" height="2" fill="currentColor" className="opacity-60" /> {/* Box body part */}
        
        {/* Contact point: fade in/out */}
        <motion.circle 
          cx="12" cy="12" r="1.5" fill="currentColor"
          initial={{ opacity: isOpen ? 0 : 1 }}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        />
      </motion.svg>
      {/* Option 2: Use Lucide icons (if preferred over dynamic SVG) */}
      {/* <StatusIcon size={32} className={`flex-grow transition-colors ${statusStyles.iconColor}`} style={{ color: derivedNodeStyles.color || statusStyles.iconColor }} /> */}


      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel}>
        {data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel.toUpperCase()}
      </p>
    </motion.div>
  );
};
// Add sld-handle-style to your global CSS for common handle visibility etc.
// .sld-handle-style { /* Basic opacity/hover logic already in PanelNode's handle classes */ }

export default memo(BreakerNode);