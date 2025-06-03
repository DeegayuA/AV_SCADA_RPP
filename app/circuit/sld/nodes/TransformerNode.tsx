// components/sld/nodes/TransformerNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformerNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cb = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(cb);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    cb();
    return () => observer.disconnect();
  }, []);
  return isDark;
};

const TransformerNode: React.FC<NodeProps<TransformerNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = (data as any).width; 
  const nodeHeightFromData = (data as any).height;

  const isDarkMode = useIsDarkMode();

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

  const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
  const tempDpConfig = useMemo(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
  const tempOpcUaNodeId = useMemo(() => tempDpConfig?.nodeId, [tempDpConfig]);
  const reactiveTempValue = useOpcUaNodeValue(tempOpcUaNodeId);

  const loadLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'loadPercentage'), [data.dataPointLinks]);
  const loadDpConfig = useMemo(() => loadLink ? dataPoints[loadLink.dataPointId] : undefined, [loadLink, dataPoints]);
  const loadOpcUaNodeId = useMemo(() => loadDpConfig?.nodeId, [loadDpConfig]);
  const reactiveLoadValue = useOpcUaNodeValue(loadOpcUaNodeId);
  
  // --- Processed States ---
  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const isTransformerEnergized = useMemo(() => 
    ['nominal', 'energized', 'online'].includes(processedStatus),
  [processedStatus]);

  const isCriticalStatus = useMemo(() => 
    ['fault', 'alarm', 'warning'].includes(processedStatus),
  [processedStatus]);

  const displayStatusText = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return "FAULT / ALARM";
    if (processedStatus === 'warning') return "WARNING";
    if (isTransformerEnergized) return "ENERGIZED";
    if (processedStatus === 'offline') return "OFFLINE";
    if (processedStatus === 'standby') return "STANDBY";
    return String(processedStatus).toUpperCase();
  }, [processedStatus, isTransformerEnergized]);
  
  const additionalInfo = useMemo(() => {
    if (tempLink && tempDpConfig && reactiveTempValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveTempValue, tempLink);
      const formatted = formatDisplayValue(mappedValue, tempLink.format, tempDpConfig.dataType);
      if(formatted) return `Temp: ${formatted}`;
    }
    if (loadLink && loadDpConfig && reactiveLoadValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveLoadValue, loadLink);
      const formatted = formatDisplayValue(mappedValue, loadLink.format, loadDpConfig.dataType);
      if(formatted) return `Load: ${formatted}`;
    }
    const pV = data.config?.primaryVoltage || 'HV';
    const sV = data.config?.secondaryVoltage || 'LV';
    return `${pV} / ${sV}`;
  }, [data.config, tempLink, tempDpConfig, reactiveTempValue, loadLink, loadDpConfig, reactiveLoadValue]);


  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgStartColor = isDarkMode ? 'rgba(51, 65, 85, 0.76)' : 'rgba(248, 250, 252, 0.76)';
    let baseBgEndColor = isDarkMode ? 'rgba(51, 65, 85, 0.66)' : 'rgba(248, 250, 252, 0.66)';
    let glowRgb = isDarkMode ? '100, 116, 139' : '148, 163, 184'; // Neutral Slate
    let additionalInfoColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

    if (processedStatus === 'fault' || processedStatus === 'alarm') {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70';
      iconColorClass = 'text-red-500 dark:text-red-400';
      textColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      additionalInfoColorClass = iconColorClass;
      glowRgb = '239, 68, 68'; // Red
    } else if (processedStatus === 'warning') {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70';
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      textColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      additionalInfoColorClass = iconColorClass;
      glowRgb = '245, 158, 11'; // Amber
    } else if (isTransformerEnergized) { // Nominal/Energized
      baseBorderClass = 'border-teal-500/80 dark:border-teal-400/70'; // Teal for energized
      iconColorClass = isDarkMode ? 'text-teal-300' : 'text-teal-500';
      textColorClass = isDarkMode ? 'text-teal-200' : 'text-teal-600';
      additionalInfoColorClass = iconColorClass;
      glowRgb = isDarkMode ? '45, 212, 191' : '20, 184, 166'; // Teal
    }
    
    return { 
        baseBorderClass, iconColorClass, textColorClass, baseBgStartColor, baseBgEndColor, additionalInfoColorClass,
        glowColor: `rgba(${glowRgb}, 0.45)`,
        activeGlowColor: `rgba(${glowRgb}, ${isTransformerEnergized && !isCriticalStatus ? 0.35 : 0})`, 
    };
  }, [processedStatus, isTransformerEnergized, isCriticalStatus, isDarkMode]);
  
  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);
  const electricCyan = 'hsl(190, 95%, 50%)';

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(displayStatusText);
  useEffect(() => {
    if (prevDisplayStatusRef.current !== displayStatusText) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevDisplayStatusRef.current = displayStatusText;
      return () => clearTimeout(timer);
    }
  }, [displayStatusText]);

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    const dynamicBgStyle = {
        '--bg-start-color': statusUiStyles.baseBgStartColor,
        '--bg-end-color': statusUiStyles.baseBgEndColor,
    } as React.CSSProperties;

    let currentBoxShadow = `0 0 7px 1.5px ${statusUiStyles.glowColor}`;
    
    if (isTransformerEnergized && !isCriticalStatus && !selected && !isRecentStatusChange) {
      // Breathing glow handled by framer-motion animate prop
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 13px 3px ${statusUiStyles.glowColor.replace('0.45', '0.65')}`; 
    }
    if (selected) {
        currentBoxShadow = `0 0 14px 2.5px ${electricCyan}, 0 0 4px 1px ${electricCyan} inset`;
    }
    
    return {
      ...dynamicBgStyle,
      borderColor: derivedNodeStyles.borderColor || statusUiStyles.baseBorderClass.split(' ').pop(),
      boxShadow: currentBoxShadow,
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '80px', 
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '90px',
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, isTransformerEnergized, isCriticalStatus, electricCyan, nodeWidthFromData, nodeHeightFromData]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || '', position: nodePosition, data,
    selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
    width: nodeWidthFromData, height: nodeHeightFromData,
    connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

  // SVG Component for Transformer Symbol
  const TransformerSymbolSVG = ({ className, isEnergized }: {className?: string, isEnergized?: boolean}) => {
    const coilVariants = {
      energized: { opacity: [0.6, 1, 0.6], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
      offline: { opacity: 1 }, // Can be less opaque if desired: 0.7
    };
    const strokeColor = derivedNodeStyles.color || statusUiStyles.iconColorClass; // Use DPL color if available

    return (
      <motion.svg viewBox="0 0 24 24" width="30" height="30" className={className} initial={false} style={{ color: strokeColor}}>
        {/* Primary Coil */}
        <motion.circle 
          cx="7" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
        />
        {/* Secondary Coil */}
        <motion.circle 
          cx="17" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
          transition={{ ...coilVariants.energized.transition, delay: 0.4 }} 
        />
        {/* Core Lines */}
        <line x1="11.5" y1="6" x2="11.5" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        <line x1="12.5" y1="6" x2="12.5" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      </motion.svg>
    );
  };

  const DisplayIconComponent = useMemo(() => {
    if (isCriticalStatus) return AlertTriangleIcon;
    return TransformerSymbolSVG;
  }, [isCriticalStatus]); // TransformerSymbolSVG itself does not change, so it's okay

  return (
    <motion.div
      className={`
        transformer-node group sld-node relative flex flex-col items-center justify-between 
        rounded-lg border backdrop-blur-sm
        transition-colors duration-300 ease-in-out
        ${statusUiStyles.baseBorderClass} 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : 'shadow-md'}
        overflow-hidden 
      `}
      style={{
        ...nodeMainStyle,
        background: `linear-gradient(to bottom, var(--bg-start-color), var(--bg-end-color))`
      }}
      initial={{ opacity: 0, scale: 0.88, y: 15 }}
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: (isTransformerEnergized && !isCriticalStatus && !selected && !isRecentStatusChange)
          ? [ 
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`,
              `0 0 12px 2.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.5')}`,
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        (isTransformerEnergized && !isCriticalStatus && !selected && !isRecentStatusChange)
          ? { type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 280, damping: 25 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.035 : 1.02,
        boxShadow: selected 
            ? `0 0 18px 3.5px ${electricCyan}, 0 0 6px 1.5px ${electricCyan} inset`
            : `0 0 15px 3.5px ${statusUiStyles.glowColor.replace('0.45', '0.6')}`
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle 
        type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-500/80 dark:!bg-slate-600/80 !border-slate-600 dark:!border-slate-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="Primary Input"
      />
      <Handle 
        type="source" position={Position.Bottom} id="secondary_out" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-500/80 dark:!bg-slate-600/80 !border-slate-600 dark:!border-slate-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="Secondary Output"
      />

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-1 right-1 h-6 w-6 rounded-full z-20 group/infobtn
                     bg-slate-300/20 dark:bg-slate-700/20 hover:bg-slate-300/40 dark:hover:bg-slate-700/40
                     p-0 backdrop-blur-sm transition-all duration-200" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 
                                group-hover/infobtn:text-[${electricCyan}] dark:group-hover/infobtn:text-[${electricCyan}] 
                                transition-colors duration-150`} /> 
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-between w-full h-full px-1.5 py-1 pointer-events-none space-y-0.5">
        <motion.p
          className="text-xs font-bold leading-tight text-center w-full text-slate-800 dark:text-slate-100 transition-colors duration-200"
          title={data.label}
          style={{ color: derivedNodeStyles.color }} // Apply DPL color if exists
        >
          {data.label}
        </motion.p>

        {/* Status text below label */}
        <div className="h-3.5 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-[9px] font-medium tracking-tight leading-tight text-center w-full ${statusUiStyles.textColorClass} transition-colors duration-200`}
                    title={`Status: ${displayStatusText}`}
                    style={{ color: derivedNodeStyles.color }} // DPL color override
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        {/* Icon Display */}
        <div className="flex-shrink-0 my-0.5"> {/* Removed pointer-events-none from here if icon itself might be interactive in future */}
            <motion.div
                animate={isCriticalStatus && DisplayIconComponent === AlertTriangleIcon ? { scale: [1, 1.06, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } : {}}
            >
                <DisplayIconComponent 
                    className="transition-colors duration-300"
                    // Style applied via SVG component if it's TransformerSymbolSVG for its own stroke logic
                    // or directly here if it's a Lucide icon
                    style={DisplayIconComponent !== TransformerSymbolSVG ? {color: derivedNodeStyles.color || statusUiStyles.iconColorClass} : {}}
                    // Pass isEnergized to our SVG component
                    {...(DisplayIconComponent === TransformerSymbolSVG && { isEnergized: isTransformerEnergized && !isCriticalStatus })}
                    // For Lucide Icon
                    size={DisplayIconComponent === AlertTriangleIcon ? 28 : undefined} 
                />
            </motion.div>
        </div>
        
        <p 
          className={`text-[9px] font-medium text-center truncate w-full leading-tight ${statusUiStyles.additionalInfoColorClass} transition-colors duration-200`} 
          title={additionalInfo}
          style={{ color: derivedNodeStyles.color }} // DPL color override for this text too
        >
          {additionalInfo}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(TransformerNode);