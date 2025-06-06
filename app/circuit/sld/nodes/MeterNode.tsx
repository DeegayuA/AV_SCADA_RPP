// components/sld/nodes/MeterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div;
import { MeterNodeData, CustomNodeType, DataPointLink, SLDElementType } from '@/types/sld'; // Added SLDElementType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    formatDisplayValue,
    // getDerivedStyle, // To be removed
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import {
    InfoIcon, ActivityIcon // Keep only icons used for UI elements not covered by appearance.icon
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// const useIsDarkMode = () => { ... }; // To be removed

const MeterNode: React.FC<NodeProps<MeterNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.config?.width;
  const nodeHeightFromData = data.config?.height;

  // const isDarkMode = useIsDarkMode(); // To be removed
  const sldAccentVar = 'var(--sld-color-accent)';

  const { 
    isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails 
  } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Status DataPointLink ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  // --- Meter Reading DataPointLink ---
  const readingLink = useMemo(() => data.dataPointLinks?.find(link => ['reading', 'value'].includes(link.targetProperty)), [data.dataPointLinks]);
  const readingDataPointConfig = useMemo(() => readingLink ? dataPoints[readingLink.dataPointId] : undefined, [readingLink, dataPoints]);
  const readingOpcUaNodeId = useMemo(() => readingDataPointConfig?.nodeId, [readingDataPointConfig]);
  const reactiveReadingValue = useOpcUaNodeValue(readingOpcUaNodeId);
  
  // --- Derived Styles DataPointLinks & Values ---
  // opcUaValuesForDerivedStyle and derivedNodeStyles are removed as direct CSS vars will be used or via appearance object.

  const processedStatus = useMemo(() => {
    let currentStatus = data.status || 'offline';
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      currentStatus = String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    if (['offline', 'unknown', undefined].includes(currentStatus) && readingOpcUaNodeId && reactiveReadingValue !== undefined) {
        currentStatus = 'nominal'; // If has live reading, assume nominal if otherwise offline
    }
    return currentStatus.toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status, readingOpcUaNodeId, reactiveReadingValue]);

  const standardNodeState = useMemo(() => {
    // For a meter, "isEnergized" could mean it's powered and reading.
    const isMeterEnergized = processedStatus === 'nominal' || processedStatus === 'online' || processedStatus === 'reading' || processedStatus === 'ok' || processedStatus === 'healthy';
    // If no specific status but has a live reading, consider it nominal/energized.
    return getStandardNodeState(processedStatus, isMeterEnergized, null, data.status, null);
  }, [processedStatus, data.status]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Meter), [standardNodeState]);
  const IconComponent = useMemo(() => appearance.icon, [appearance.icon]);

  const displayStatusText = useMemo(() => {
    // Use standard state for more consistent text, or refine as needed
    if (standardNodeState === 'FAULT') return "FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    if (standardNodeState === 'NOMINAL' || standardNodeState === 'ENERGIZED' || standardNodeState === "DATA_DISPLAY") return "NOMINAL"; // DATA_DISPLAY can show as NOMINAL
    return standardNodeState.replace(/_/g, ' ');
  }, [standardNodeState]);

  const isCriticalStatus = useMemo(() => standardNodeState === 'FAULT' || standardNodeState === 'WARNING', [standardNodeState]);
  
  const meterReadingToDisplay = useMemo(() => {
    if (readingLink && readingDataPointConfig && reactiveReadingValue !== undefined) {
      const mapped = applyValueMapping(reactiveReadingValue, readingLink);
      return formatDisplayValue(mapped, readingLink.format, readingDataPointConfig.dataType);
    }
    if (data.config?.value !== undefined) { // Check for static value if no link
        return formatDisplayValue(data.config.value, readingLink?.format, readingDataPointConfig?.dataType);
    }
    return data.config?.meterType || '---';
  }, [readingLink, readingDataPointConfig, reactiveReadingValue, data.config]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState);
  useEffect(() => {
    if (prevDisplayStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevDisplayStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 0 7px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.4)').replace('var(','rgba(')}`;
    if (isCriticalStatus && !selected && !isRecentStatusChange) {
      // Breathing animation for critical states handled by framer-motion
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 13px 3px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.65)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 14px 2.5px ${sldAccentVar.replace(')', ', 0.7)').replace('var(','rgba(')}, 0 0 4px 1px ${sldAccentVar.replace(')', ', 0.5)').replace('var(','rgba(')} inset`;
    }
    
    return {
      borderColor: appearance.borderColorVar,
      boxShadow: currentBoxShadow,
      opacity: (data as any).opacity ?? 1,
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '110px', 
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '95px', 
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, isCriticalStatus, (data as any).opacity]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
      id, type: type || SLDElementType.Meter, position: nodePosition, data,
      selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
      width: parseInt(String(nodeMainStyle.width).replace('px', '')), 
      height: parseInt(String(nodeMainStyle.height).replace('px', '')),
      connectable: isConnectable || false,
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeMainStyle.width, nodeMainStyle.height, isConnectable]);

  return (
    <MotionDiv
      className={`
        meter-node group sld-node relative flex flex-col items-center justify-between 
        rounded-lg border-2 backdrop-blur-sm 
        transition-colors duration-300 ease-in-out
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : ''}
        overflow-hidden p-2
      `}
      style={{
        ...nodeMainStyle, // borderColor, boxShadow, opacity, width, height
        background: `var(--sld-color-node-bg)`,
      }}
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: isCriticalStatus && !selected && !isRecentStatusChange
          ? [ 
              `0 0 8px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`,
              `0 0 12px 2.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.5)').replace('var(','rgba(')}`,
              `0 0 8px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        isCriticalStatus && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 200, damping: 18, boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 260, damping: 20 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.035 : 1.02,
        boxShadow: selected 
            ? `0 0 18px 3.5px ${sldAccentVar.replace(')', ', 0.8)').replace('var(','rgba(')}, 0 0 6px 1.5px ${sldAccentVar.replace(')', ', 0.6)').replace('var(','rgba(')} inset`
            : `0 0 15px 3.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.6)').replace('var(','rgba(')}`
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} 
        className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="Input/Measurement"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} 
        className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="Output/Passthrough"/>

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-1 right-1 h-6 w-6 rounded-full z-20 group/infobtn
                     bg-slate-300/20 dark:bg-slate-700/20 hover:bg-slate-300/40 dark:hover:bg-slate-700/40
                     p-0 backdrop-blur-sm transition-all duration-200" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 
                                group-hover/infobtn:text-[var(--sld-color-accent)]
                                transition-colors duration-150`} /> 
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-between w-full h-full pointer-events-none space-y-1" style={{ color: appearance.textColorVar }}>
        <p className={`text-xs font-semibold text-center truncate w-full leading-tight`} title={data.label}>
          {data.label}
        </p>

        <div className="relative h-7 w-7 flex items-center justify-center my-0.5">
            <AnimatePresence mode="wait">
                <motion.div
                    key={standardNodeState} // Changed key to ensure re-render on full state change
                    initial={{ opacity: 0, y: 8, scale: 0.75 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.75, transition: {duration: 0.15, ease: "easeIn"} }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="absolute"
                >
                    <IconComponent
                        size={28}
                        className={`transition-colors duration-300`}
                        style={{ color: appearance.iconColorVar }}
                        strokeWidth={ isCriticalStatus ? 2.1 : 1.85 }
                    />
                </motion.div>
            </AnimatePresence>
        </div>
        
        <div className="h-4 overflow-hidden"> 
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-[10px] font-medium tracking-tight leading-tight text-center w-full transition-colors duration-200`}
                    style={{ color: appearance.statusTextColorVar }}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>

        <div className="flex items-center justify-center space-x-1 mt-auto pt-0.5" title={`Reading: ${meterReadingToDisplay}`}>
            {readingOpcUaNodeId && reactiveReadingValue !== undefined && (
                <motion.div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: appearance.mainStatusColorVar }} // Use main status color for live tick
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    title="Live Data"
                />
            )}
            <AnimatePresence mode="popLayout">
                 <motion.p
                    key={`reading-${meterReadingToDisplay}`}
                    className={`text-sm leading-tight text-center whitespace-nowrap transition-colors duration-200`}
                    style={{ color: appearance.mainStatusColorVar }} // Reading uses main status/accent color
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4, transition:{duration:0.1} }} 
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {meterReadingToDisplay}
                </motion.p>
            </AnimatePresence>
        </div>
      </div>
    </MotionDiv>
  );
};

export default memo(MeterNode);