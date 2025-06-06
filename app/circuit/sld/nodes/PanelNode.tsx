// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    // formatDisplayValue, // May not be needed if displayStatusText is derived from standard state
    // getDerivedStyle, // To be replaced by new system
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
// Keep only essential direct icon imports if not covered by NodeAppearance or for specific UI elements
import { InfoIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Helper for theme detection (remains the same) - Will be removed as CSS vars handle theming
// const useIsDarkMode = () => { ... };

const PanelNode: React.FC<NodeProps<PanelNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width;
  const nodeHeightFromData = data.height;

  // const isDarkMode = useIsDarkMode(); // To be removed

  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Reactive Data Point Links & Values ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]); // Used to check if power is 'live'
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  // Use the same source for animation power for simplicity, but could be different
  const animationPowerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'panel.powerGeneration') || powerLink, [data.dataPointLinks, powerLink]);
  const animationPowerDataPointConfig = useMemo(() => animationPowerLink ? dataPoints[animationPowerLink.dataPointId] : undefined, [animationPowerLink, dataPoints]);
  const animationPowerOpcUaNodeId = useMemo(() => animationPowerDataPointConfig?.nodeId, [animationPowerDataPointConfig]);
  const reactiveAnimationPowerValue = useOpcUaNodeValue(animationPowerOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  // WOW: Get unformatted numeric power for precise logic
  const currentNumericPower = useMemo(() => {
    let powerVal: number | undefined = undefined;
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mapped = applyValueMapping(reactivePowerValue, powerLink);
      if (typeof mapped === 'number') powerVal = mapped;
      else if (typeof mapped === 'string') { const p = parseFloat(mapped); if (!isNaN(p)) powerVal = p; }
      else if (typeof mapped === 'boolean') powerVal = mapped ? (data.config?.powerRatingWp || 100) : 0; // Example handling for boolean
    }
    return powerVal;
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.powerRatingWp]);
  
  const numericAnimationPower = useMemo(() => { // Power for animation intensity, always >= 0
    let pAnim: number | undefined = undefined;
     if (animationPowerLink && animationPowerDataPointConfig && reactiveAnimationPowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveAnimationPowerValue, animationPowerLink);
      if (typeof mappedValue === 'number') pAnim = mappedValue;
      else if (typeof mappedValue === 'string') { const parsed = parseFloat(mappedValue); if (!isNaN(parsed)) pAnim = parsed; }
      else if (typeof mappedValue === 'boolean') pAnim = mappedValue ? (data.config?.powerRatingWp || 100) : 0;
    }
    // Fallback to currentNumericPower if animation specific one isn't providing a value
    return Math.max(0, pAnim ?? currentNumericPower ?? 0);
  }, [animationPowerLink, animationPowerDataPointConfig, reactiveAnimationPowerValue, currentNumericPower, data.config?.powerRatingWp]);


  const powerRatingWp = useMemo(() => data.config?.powerRatingWp, [data.config?.powerRatingWp]);

  const panelOutputState = useMemo((): 'PRODUCING_HIGH' | 'PRODUCING_MEDIUM' | 'PRODUCING_LOW' | 'IDLE_DAY' | 'IDLE_NIGHT' | null => {
    if (currentNumericPower === undefined || currentNumericPower === null) return null; // Not enough info yet

    if (currentNumericPower > 0) {
        if (!powerRatingWp || powerRatingWp <= 0) return 'PRODUCING_MEDIUM'; // Producing, but no rating to compare
        const ratio = currentNumericPower / powerRatingWp;
        if (ratio >= 0.7) return 'PRODUCING_HIGH';  // 70%+
        if (ratio >= 0.15) return 'PRODUCING_MEDIUM'; // 15-70%
        return 'PRODUCING_LOW';   // <15%
    } else { // currentNumericPower <= 0
        // Basic check for night (could be improved with actual sun position/irradiance)
        // For now, assume if not producing and status is nominal/ok, it's night or very overcast
        if (processedStatus === 'nominal' || processedStatus === 'ok' || processedStatus === 'online' || processedStatus === 'standby' || processedStatus === 'idle') {
            // A more direct "isDaylight" signal would be better here.
            // Placeholder: if animation power also zero, assume night/deep overcast.
            return numericAnimationPower <= 0 ? 'IDLE_NIGHT' : 'IDLE_DAY';
        }
        return 'IDLE_DAY'; // Default to idle day if specific night conditions not met
    }
  }, [currentNumericPower, powerRatingWp, processedStatus, numericAnimationPower]);

  const standardNodeState = useMemo(() => {
    return getStandardNodeState(processedStatus, undefined, undefined, data.status, panelOutputState);
  }, [processedStatus, data.status, panelOutputState]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);
  const StatusIconComponent = useMemo(() => appearance.icon, [appearance.icon]); // Get icon component from appearance

  const productionRatio = useMemo(() => { // Recalculate for animation based on new states
    if (standardNodeState === 'PRODUCING_HIGH') return 1.0;
    if (standardNodeState === 'PRODUCING_MEDIUM') return 0.5;
    if (standardNodeState === 'PRODUCING_LOW') return 0.15;
    if (powerRatingWp && powerRatingWp > 0 && currentNumericPower !== undefined && currentNumericPower > 0) {
      return Math.max(0, Math.min(1, currentNumericPower / powerRatingWp));
    }
    return 0;
  }, [standardNodeState, currentNumericPower, powerRatingWp]);

  const displayStatusText = useMemo(() => {
    // Customize based on standardNodeState if needed, or make it more generic
    if (standardNodeState === 'FAULT') return "FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState.startsWith('PRODUCING')) return "PRODUCING";
    if (standardNodeState.startsWith('IDLE')) return "IDLE";
    return standardNodeState.replace(/_/g, ' '); // Default
  }, [standardNodeState]);
  
  const isProducingPositive = useMemo(() => standardNodeState.startsWith('PRODUCING') && productionRatio > 0.05, [standardNodeState, productionRatio]);

  // Animation speed for sun pulse based on production level
  const animationPulseDuration = useMemo(() => { 
    if (!isProducingPositive || !standardNodeState.startsWith('PRODUCING')) return 2.5;
    const baseDuration = 3.0;
    const minDuration = 0.4;
    let ratioFactor = 0.5; // Default for medium or generic producing
    if (standardNodeState === 'PRODUCING_HIGH') ratioFactor = 1.0;
    else if (standardNodeState === 'PRODUCING_LOW') ratioFactor = 0.2;

    const speedFactor = ratioFactor * 2.5;
    return Math.max(minDuration, baseDuration / (1 + speedFactor));
  }, [isProducingPositive, standardNodeState]);

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
  
  const sldAccentVar = 'var(--sld-color-accent)';

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 0 7px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.4)').replace('var(','rgba(')}`;
    if (isProducingPositive && !selected && !isRecentStatusChange) {
      // Breathing glow handled by framer-motion animate prop
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
      color: appearance.textColorVar, // Default text color for node
      minWidth: '120px',
      minHeight: '100px',
      ...(typeof nodeWidthFromData === 'number' && { width: `${nodeWidthFromData}px` }),
      ...(typeof nodeHeightFromData === 'number' && { height: `${nodeHeightFromData}px` }),
    };
  }, [appearance, selected, isRecentStatusChange, isProducingPositive, sldAccentVar, nodeWidthFromData, nodeHeightFromData]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
      id, type: type || '', position: nodePosition, data,
      selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
      width: nodeWidthFromData, height: nodeHeightFromData,
      connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);


  // WOW: Formatted Power Output with Rated Power Context
  const formattedPowerOutputWithContext = useMemo(() => {
    const powerStr = (currentNumericPower !== undefined)
      ? `${currentNumericPower.toFixed(currentNumericPower < 10 ? 1 : 0)}W` // Show decimal for small values
      : (powerLink ? "--- W" : (powerRatingWp ? "Rated" : "N/A")); // Show --- if link exists but no value yet

    if (powerRatingWp) {
      return powerStr === "Rated" ? `${powerRatingWp}Wp (Rated)` : `${powerStr} / ${powerRatingWp}Wp`;
    }
    return powerStr;
  }, [currentNumericPower, powerRatingWp, powerLink]);
  

  return (
    <motion.div
      className={`
        panel-node group sld-node relative flex flex-col items-center justify-center 
        rounded-lg border backdrop-blur-sm 
        transition-colors duration-300 ease-in-out
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : 'shadow-md'}
        overflow-hidden 
      `}
      style={{
        ...nodeMainStyle, // Includes borderColor, boxShadow, color (for text)
        background: `linear-gradient(to bottom, var(--sld-color-node-bg), color-mix(in srgb, var(--sld-color-node-bg) 90%, black))`,
        '--tw-ring-color': selected ? sldAccentVar : 'transparent',
      } as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.88, y: 18 }}
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: isProducingPositive && !selected && !isRecentStatusChange 
          ? [
              `0 0 8px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.25)').replace('var(','rgba(')}`,
              `0 0 12px 2.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.45)').replace('var(','rgba(')}`,
              `0 0 8px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.25)').replace('var(','rgba(')}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        isProducingPositive && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: animationPulseDuration, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 280, damping: 25 }
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
      {/* Consistent Handle Styling with InverterNode */}
      <Handle
        type="target" position={Position.Top} id="top_in" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}
        title="DC Input"
      />
      <Handle
        type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)' }}
        title="DC Output"
      />

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
      
      <div className="flex flex-col items-center justify-between w-full h-full px-2 py-1.5 space-y-1 pointer-events-none">
        <div className="relative h-8 w-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.div
                    key={standardNodeState}
                    initial={{ opacity: 0, y: 10, scale: 0.7 }}
                    animate={{ 
                        opacity: 1, y: 0, scale: 1,
                        filter: StatusIconComponent.displayName === 'Sun' && isProducingPositive ? `brightness(${0.8 + productionRatio * 0.7}) saturate(${1 + productionRatio * 0.5})` : 'none',
                     }}
                    exit={{ opacity: 0, y: -10, scale: 0.7, transition: {duration: 0.15, ease: "easeIn"} }}
                    transition={{ 
                        type: 'spring', stiffness:200, damping:15,
                        filter: { duration: 0.5 }
                    }}
                    className="absolute"
                >
                    <StatusIconComponent 
                        size={26}
                        className="transition-colors duration-300" // Tailwind class for color transition
                        style={{ color: appearance.iconColorVar }}
                        strokeWidth={
                            standardNodeState === 'FAULT' || standardNodeState === 'WARNING' ? 2.2 :
                            (StatusIconComponent.displayName === 'Sun' && isProducingPositive ? 1.8 + (productionRatio * 0.5) : 1.75)
                        }
                    />
                </motion.div>
            </AnimatePresence>
            {StatusIconComponent.displayName === 'Sun' && isProducingPositive && (
                <motion.div
                    className="absolute inset-[-4px] rounded-full"
                    style={{
                        boxShadow: `0 0 ${6 + productionRatio * 10}px ${2 + productionRatio * 3}px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')',', 0.2)').replace('var(','rgba(')}`
                    }}
                    animate={{ 
                        scale: [1, 1.05 + productionRatio * 0.25, 1], 
                        opacity: [0.3 + productionRatio * 0.3, 0.5 + productionRatio * 0.5, 0.3 + productionRatio * 0.3]
                    }}
                    transition={{ duration: animationPulseDuration, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
        
        <div className="h-4 overflow-hidden mt-0.5"> 
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-xs font-semibold tracking-tight leading-tight text-center w-full transition-colors duration-200`}
                    style={{ color: appearance.statusTextColorVar }}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        <motion.p
          className={`text-sm font-bold leading-tight text-center w-full transition-colors duration-200 mt-0.5`}
          style={{ color: appearance.textColorVar }}
          title={data.label}
        >
          {data.label}
        </motion.p>

        <div className="flex items-center justify-center space-x-1 text-xs font-medium mt-auto" title={`Power: ${formattedPowerOutputWithContext}`}>
            <TrendingUpIcon 
                size={12} 
                className={`transition-colors duration-200 ${currentNumericPower !== undefined && currentNumericPower < 0 ? 'transform rotate-180 text-blue-500 dark:text-blue-400' : ''}`}
                style={{ color: appearance.statusTextColorVar }} // Use status text color for power icon
            />
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={`power-${formattedPowerOutputWithContext}`}
                    className={`font-semibold transition-colors duration-200`}
                    style={{ color: appearance.statusTextColorVar }} // Use status text color for power value
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4, transition:{duration:0.1} }} 
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {formattedPowerOutputWithContext.split(" / ")[0]}
                    {formattedPowerOutputWithContext.includes(" / ") && (
                        <span className="text-[10px] opacity-70 dark:opacity-60"> / {formattedPowerOutputWithContext.split(" / ")[1]}</span>
                    )}
                </motion.span>
            </AnimatePresence>
            {powerOpcUaNodeId && currentNumericPower !== undefined && (
                <motion.div 
                    className="w-1.5 h-1.5 rounded-full ml-0.5"
                    style={{ backgroundColor: appearance.statusTextColorVar }} // Use status text color
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    title="Live Data"
                />
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);