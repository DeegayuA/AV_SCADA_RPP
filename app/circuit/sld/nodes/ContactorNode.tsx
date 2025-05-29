// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { ContactorNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { PowerIcon, PowerOffIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
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

  const isClosedLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isClosed'), [data.dataPointLinks]);
  const isClosedDataPointConfig = useMemo(() => isClosedLink ? dataPoints[isClosedLink.dataPointId] : undefined, [isClosedLink, dataPoints]);
  const isClosedOpcUaNodeId = useMemo(() => isClosedDataPointConfig?.nodeId, [isClosedDataPointConfig]);
  const reactiveIsClosedValue = useOpcUaNodeValue(isClosedOpcUaNodeId);
  // --- End Reactive Data Point Handling ---

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'open'; // Default to open
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const isClosed = useMemo(() => {
    if (isClosedLink && isClosedDataPointConfig && reactiveIsClosedValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsClosedValue, isClosedLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus
    return processedStatus === 'closed' || processedStatus === 'energized';
  }, [isClosedLink, isClosedDataPointConfig, reactiveIsClosedValue, processedStatus]);


  const { borderClass, bgClass, textClass, Icon } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', textClass: 'text-destructive', Icon: AlertTriangleIcon };
    if (processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', Icon: AlertTriangleIcon };
    if (isClosed) 
      return { borderClass: 'border-green-600', bgClass: 'bg-green-600/10', textClass: 'text-green-600', Icon: PowerIcon };
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', Icon: PowerOffIcon };
  }, [processedStatus, isClosed]);
  
  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (isClosedOpcUaNodeId && reactiveIsClosedValue !== undefined) {
      primaryOpcUaValues[isClosedOpcUaNodeId] = reactiveIsClosedValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, isClosedOpcUaNodeId, reactiveIsClosedValue, globalOpcUaNodeValues]);
  
  const contactorSymbolColor = derivedNodeStyles.color || textClass;

  // Combine classes and styles
  const mainDivClasses = `
    sld-node contactor-node group custom-node-hover w-[60px] h-[80px] rounded-md shadow-md
    flex flex-col items-center justify-between /* p-1 removed, moved to content wrapper */
    border-2 ${derivedNodeStyles.borderColor ? '' : borderClass} 
    /* specific bgClass, bg-card, textClass (via derivedNodeStyles) removed, moved to content wrapper */
    /* transition-all duration-150 is part of custom-node-hover */
    /* selected ring styles removed */
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
    /* hover:shadow-lg removed */
  `;

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

  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const fullNodeObject: CustomNodeType = {
        id, 
        type, 
        position: { x: xPos, y: yPos }, // Use xPos, yPos for position
        data, 
        selected, 
        dragging, 
        zIndex, 
                width: undefined, // Remove reference to non-existent props.width
                height: undefined, // Remove reference to non-existent props.height
        connectable: isConnectable,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={mainDivClasses}
      style={{ 
        borderColor: derivedNodeStyles.borderColor || undefined, // Apply border from derived or let class handle
        // backgroundColor and color are now primarily for the node-content-wrapper
        opacity: derivedNodeStyles.opacity || undefined, // Apply opacity if derived
      }}
      // variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={handleInfoClick}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Handles are outside node-content-wrapper */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" />

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1 w-full h-full rounded-sm 
                    ${derivedNodeStyles.backgroundColor ? '' : bgClass} 
                    ${derivedNodeStyles.color ? '' : textClass}
                    bg-card dark:bg-neutral-800
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          backgroundColor: derivedNodeStyles.backgroundColor || undefined, // Explicitly set from DPL or let class apply
          color: derivedNodeStyles.color || undefined, // Explicitly set from DPL or let class apply
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label} {/* Text color will be inherited */}
        </p>
        
        <motion.svg 
          viewBox="0 0 24 24" 
          width="30" height="30" 
          className="transition-colors duration-200" // textClass removed, color inherited
          style={{ color: 'currentColor' }} // Inherits color from parent (node-content-wrapper)
          initial={false}
        >
          <circle cx="6" cy="8" r="2" fill="currentColor" /> 
          <circle cx="18" cy="8" r="2" fill="currentColor" />
          <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" />
          
          <motion.line
            key={`left-contact-${isClosed}`}
            x1="6" y1="10"
            initial={false}
            animate={isClosed ? { x2: 6, y2: 16 } : { x2: 6, y2: 13 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            stroke="currentColor" strokeWidth="1.5"
          />
          {!isClosed && (
            <motion.line
              key="left-angled-contact"
              x1="6" y1="13" x2="8" y2="15"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 0.15 }}
              stroke="currentColor" strokeWidth="1.5"
            />
          )}
          
          <motion.line
            key={`right-contact-${isClosed}`}
            x1="18" y1="10"
            initial={false}
            animate={isClosed ? { x2: 18, y2: 16 } : { x2: 18, y2: 16 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            stroke="currentColor" strokeWidth="1.5"
          />
          
          <rect x="4" y="16" width="16" height="3" rx="1" fill="currentColor" className="opacity-70"/>
        </motion.svg>
        
        <p className="text-[9px] font-bold"> {/* Text color will be inherited */}
          {isClosed ? 'CLOSED' : 'OPEN'}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(ContactorNode);