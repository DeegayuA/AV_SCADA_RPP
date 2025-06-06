// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { ContactorNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld'; // Added SLDElementType
import { useAppStore } from '@/stores/appStore';
import {
    // getDataPointValue,
    applyValueMapping,
    // getDerivedStyle, // To be replaced
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import { InfoIcon } from 'lucide-react'; // Keep InfoIcon for button
import { Button } from "@/components/ui/button";

import { useOpcUaNodeValue } from '@/stores/appStore';

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
    return data.status || 'open';
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const isContactorClosed = useMemo(() => { // Renamed to avoid conflict
    if (isClosedLink && isClosedDataPointConfig && reactiveIsClosedValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsClosedValue, isClosedLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    return String(processedStatus).toLowerCase() === 'closed' || String(processedStatus).toLowerCase() === 'energized';
  }, [isClosedLink, isClosedDataPointConfig, reactiveIsClosedValue, processedStatus]);

  const standardNodeState = useMemo(() => {
    // If closed, assume it's energized for styling purposes unless status says FAULT/WARNING/OFFLINE
    // If open, assume it's de-energized for styling unless status says FAULT/WARNING
    const statusUpper = processedStatus?.toUpperCase();
    if (statusUpper === 'FAULT' || statusUpper === 'ALARM') return 'FAULT';
    if (statusUpper === 'WARNING') return 'WARNING';
    if (statusUpper === 'OFFLINE') return 'OFFLINE';

    const isEnergizedAssumption = isContactorClosed; // If closed, style as energized path, else de-energized path
    return getStandardNodeState(processedStatus, isEnergizedAssumption, !isContactorClosed, data.status);
  }, [processedStatus, isContactorClosed, data.status]);
  
  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Contactor), [standardNodeState]);
  const IconComponent = useMemo(() => appearance.icon, [appearance.icon]);
  const sldAccentVar = 'var(--sld-color-accent)';

  const displayStatusText = useMemo(() => { // OPEN / CLOSED text
    return isContactorClosed ? 'CLOSED' : 'OPEN';
  }, [isContactorClosed]);

  const mainDivClasses = `
    sld-node contactor-node group custom-node-hover w-[60px] h-[80px] rounded-md shadow-md
    flex flex-col items-center justify-between
    border-2
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
  `;

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState);

  useEffect(() => {
    if (prevStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700);
      prevStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

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
      className={`${mainDivClasses} ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}`}
      style={{ 
        borderColor: appearance.borderColorVar,
        opacity: data.opacity ?? 1, // Apply opacity if available in data, default to 1
      }}
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1.01 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={handleInfoClick}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3" style={{ color: 'var(--sld-color-text-muted)'}} />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>

      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1 w-full h-full rounded-sm 
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label} style={{color: appearance.textColorVar}}>
          {data.label}
        </p>
        
        <motion.div
            className="my-1 flex items-center justify-center w-[30px] h-[30px]"
            key={standardNodeState} // Re-render if icon changes
            initial={{ opacity: 0.8, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
             <IconComponent
                size={28}
                className="transition-colors duration-200"
                style={{ color: appearance.iconColorVar }}
             />
        </motion.div>
        
        <p className="text-[9px] font-bold" style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(ContactorNode);