// components/sld/nodes/MeterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
const MotionDiv = motion.div;
import { MeterNodeData, CustomNodeType, DataPointLink } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { 
    GaugeIcon, AlertTriangleIcon, CheckCircleIcon, PowerOffIcon, InfoIcon, ActivityIcon
} from 'lucide-react';
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

const MeterNode: React.FC<NodeProps<MeterNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.config?.width;
  const nodeHeightFromData = data.config?.height;

  const isDarkMode = useIsDarkMode();
  const electricCyan = 'hsl(190, 95%, 50%)';

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
  // Consolidate all relevant OPC UA values for derived styles to avoid multiple useOpcUaNodeValue calls for the same nodeId
  const opcUaValuesForDerivedStyle = useMemo(() => {
    const uniqueNodeIds = new Set<string>();
    if (statusOpcUaNodeId) uniqueNodeIds.add(statusOpcUaNodeId);
    if (readingOpcUaNodeId) uniqueNodeIds.add(readingOpcUaNodeId);
    data.dataPointLinks?.forEach(link => {
      if (['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || link.targetProperty.startsWith('--')) {
        const dpConfig = dataPoints[link.dataPointId];
        if (dpConfig?.nodeId) uniqueNodeIds.add(dpConfig.nodeId);
      }
    });
    
    const values: Record<string, any> = {};
    uniqueNodeIds.forEach(nodeId => {
      // This relies on globalOpcUaNodeValues being up-to-date from the store.
      // For truly reactive derived styles on *any* linked DP, one might need more individual useOpcUaNodeValue hooks or a more complex aggregator.
      // However, for primary status/reading and a few style links, this is a pragmatic approach.
      if (globalOpcUaNodeValues.hasOwnProperty(nodeId)) {
        values[nodeId] = globalOpcUaNodeValues[nodeId];
      }
    });
    // Ensure the specific reactive values we fetched above are included if their nodeIds were part of the set
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) values[statusOpcUaNodeId] = reactiveStatusValue;
    if (readingOpcUaNodeId && reactiveReadingValue !== undefined) values[readingOpcUaNodeId] = reactiveReadingValue;

    return values;
  }, [data.dataPointLinks, dataPoints, statusOpcUaNodeId, readingOpcUaNodeId, reactiveStatusValue, reactiveReadingValue, globalOpcUaNodeValues]);

  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, opcUaValuesForDerivedStyle), [data, dataPoints, opcUaValuesForDerivedStyle]);

  const processedStatus = useMemo(() => {
    let currentStatus = data.status || 'offline'; // Default status from data prop
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      currentStatus = String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    // If status is still 'offline' or 'unknown' but we have a live reading, consider it 'nominal'
    if (['offline', 'unknown', undefined].includes(currentStatus) && readingOpcUaNodeId && reactiveReadingValue !== undefined) {
        currentStatus = 'nominal';
    }
    return currentStatus.toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status, readingOpcUaNodeId, reactiveReadingValue]);

  const displayStatusText = useMemo(() => {
    if (['fault', 'alarm'].includes(processedStatus)) return "FAULT";
    if (processedStatus === 'warning') return "WARNING";
    if (processedStatus === 'offline' || processedStatus === 'off') return "OFFLINE";
    if (processedStatus === 'standby') return "STANDBY";
    if (['nominal', 'online', 'reading', 'healthy', 'ok'].includes(processedStatus)) return "NOMINAL";
    return String(processedStatus).toUpperCase();
  }, [processedStatus]);

  const isFaulty = useMemo(() => ['fault', 'alarm'].includes(processedStatus), [processedStatus]);
  const isWarning = useMemo(() => processedStatus === 'warning', [processedStatus]);
  const isNominal = useMemo(() => ['nominal', 'online', 'reading', 'healthy', 'ok'].includes(processedStatus), [processedStatus]);
  const isOffline = useMemo(() => ['offline', 'off', 'standby'].includes(processedStatus) || (!isFaulty && !isWarning && !isNominal), [processedStatus, isFaulty, isWarning, isNominal]);


  const StatusIconComponent = useMemo(() => {
    if (isFaulty) return AlertTriangleIcon;
    if (isWarning) return AlertTriangleIcon;
    if (isNominal) return GaugeIcon; // Or CheckCircleIcon if reading is within certain bands (more complex)
    if (isOffline && displayStatusText === "STANDBY") return PowerOffIcon; // Could use a specific standby icon
    return GaugeIcon; // Default or Offline state
  }, [isFaulty, isWarning, isNominal, isOffline, displayStatusText]);
  
  const meterReadingToDisplay = useMemo(() => {
    if (readingLink && readingDataPointConfig && reactiveReadingValue !== undefined) {
      const mapped = applyValueMapping(reactiveReadingValue, readingLink);
      return formatDisplayValue(mapped, readingLink.format, readingDataPointConfig.dataType);
    }
    // Fallback: use static data.label for meter "value" if no dynamic link, or show type.
    // This part might need adjustment based on how you want to display static meters.
    // If there's no reading link, and data.value exists, display that, otherwise meterType.
    if (data.config?.value !== undefined) {
        return formatDisplayValue(data.config.value, readingLink?.format, readingDataPointConfig?.dataType);
    }
    return data.config?.meterType || '---';
  }, [readingLink, readingDataPointConfig, reactiveReadingValue, data.config]);


  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let readingColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-600'; // Default for reading if nominal
    let baseBgStartColor = isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)'; 
    let baseBgEndColor = isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)';  
    let glowRgb = isDarkMode ? '71, 85, 105' : '148, 163, 184'; // Default slate glow
    let activeGlowIntensity = 0.2;

    if (isFaulty) {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70';
      iconColorClass = 'text-red-500 dark:text-red-400';
      textColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      readingColorClass = iconColorClass;
      glowRgb = '239, 68, 68'; activeGlowIntensity = 0.55;
    } else if (isWarning) {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70';
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      textColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      readingColorClass = iconColorClass;
      glowRgb = '245, 158, 11'; activeGlowIntensity = 0.45;
    } else if (isNominal) {
      baseBorderClass = isDarkMode ? 'border-sky-500/70' : 'border-sky-600/80';
      iconColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-500'; // Icon is sky
      textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600'; // Status text is subtle
      readingColorClass = isDarkMode ? 'text-sky-200 font-bold' : 'text-sky-700 font-bold'; // Reading is prominent sky
      glowRgb = isDarkMode ? '56, 189, 248' : '14, 165, 233'; activeGlowIntensity = 0.3;
    } else if (isOffline) {
      // Default slate styling, but maybe slightly dimmed
      iconColorClass = isDarkMode ? 'text-slate-500' : 'text-slate-400';
      textColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
      readingColorClass = textColorClass;
      activeGlowIntensity = 0.1;
    }

    // Overrides from derivedNodeStyles
    const finalIconColor = derivedNodeStyles.color || iconColorClass;
    const finalTextColor = derivedNodeStyles.color || textColorClass;
    // For reading, let's allow a specific 'readingColor' if derived, then derived 'color', then status-based.
    const finalReadingColor = derivedNodeStyles.color || readingColorClass;


    return { 
        baseBorderClass: derivedNodeStyles.borderColor ? '' : baseBorderClass, // If derived borderColor exists, it's handled in nodeMainStyle
        iconColorClass: finalIconColor, 
        textColorClass: finalTextColor, 
        readingColorClass: finalReadingColor,
        baseBgStartColor: derivedNodeStyles.backgroundColor || baseBgStartColor, // Derived can override simple BG
        baseBgEndColor: derivedNodeStyles.backgroundColor || baseBgEndColor,     // But not complex gradient by default
        glowColor: `rgba(${glowRgb}, ${activeGlowIntensity})`, 
        activeGlowColor: `rgba(${glowRgb}, ${Math.min(1, activeGlowIntensity * 1.5)})`
    };
  }, [processedStatus, isDarkMode, isFaulty, isWarning, isNominal, isOffline, derivedNodeStyles]);

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
    const dynamicBgStyle = (derivedNodeStyles.backgroundColor) 
      ? { backgroundColor: derivedNodeStyles.backgroundColor } // If derived BG, use it flat
      : { 
          '--bg-start-color': statusUiStyles.baseBgStartColor, // Else, use gradient from status
          '--bg-end-color': statusUiStyles.baseBgEndColor,
        } as React.CSSProperties;

    let currentBoxShadow = `0 0 7px 1.5px ${statusUiStyles.glowColor}`;
    if ((isFaulty || isWarning) && !selected && !isRecentStatusChange) { 
      // Breathing animation for critical states handled by framer-motion animate prop
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 13px 3px ${statusUiStyles.glowColor.replace(/[\d\.]+\)$/, '0.65)')}`; 
    }
    if (selected) {
        currentBoxShadow = `0 0 14px 2.5px ${electricCyan}, 0 0 4px 1px ${electricCyan} inset`;
    }
    
    return {
      ...dynamicBgStyle,
      borderColor: derivedNodeStyles.borderColor || statusUiStyles.baseBorderClass.split(' ').pop(), // Use derived if available
      boxShadow: currentBoxShadow,
      opacity: derivedNodeStyles.opacity ?? 1,
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '110px', 
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '95px', 
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, electricCyan, nodeWidthFromData, nodeHeightFromData, isFaulty, isWarning]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
      id, type: type || '', position: nodePosition, data,
      selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
      width: parseInt(String(nodeMainStyle.width).replace('px', '')), 
      height: parseInt(String(nodeMainStyle.height).replace('px', '')),
      connectable: isConnectable || false,
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeMainStyle.width, nodeMainStyle.height, isConnectable]);

  const shouldPulseAnimate = useMemo(() => (isFaulty || isWarning), [isFaulty, isWarning]);

  return (
    <MotionDiv
      className={`
        meter-node group sld-node relative flex flex-col items-center justify-between 
        rounded-lg border-2 backdrop-blur-sm 
        transition-colors duration-300 ease-in-out
        ${statusUiStyles.baseBorderClass} {/* Base border from status, overridden by derivedNodeStyles.borderColor in style prop */}
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : ''}
        overflow-hidden p-2
      `}
      style={{
        ...nodeMainStyle,
        background: derivedNodeStyles.backgroundColor // If derivedNodeStyles provides BG, use it directly
          ? derivedNodeStyles.backgroundColor
          : `linear-gradient(to bottom, var(--bg-start-color), var(--bg-end-color))`, // Else, use gradient
      }}
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: shouldPulseAnimate && !selected && !isRecentStatusChange 
          ? [ 
              `0 0 8px 1.5px ${statusUiStyles.glowColor}`,
              `0 0 12px 2.5px ${statusUiStyles.activeGlowColor}`,
              `0 0 8px 1.5px ${statusUiStyles.glowColor}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        shouldPulseAnimate && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 200, damping: 18, boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 260, damping: 20 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.035 : 1.02,
        boxShadow: selected 
            ? `0 0 18px 3.5px ${electricCyan}, 0 0 6px 1.5px ${electricCyan} inset`
            : (() => {
                const match = statusUiStyles.glowColor.match(/[\d\.]+\)$/);
                const opacity = parseFloat(match?.[0]?.replace(')', '') || '0.2');
                const enhancedOpacity = Math.min(1, opacity * 2.5);
                return statusUiStyles.glowColor.replace(/[\d\.]+\)$/, `${enhancedOpacity})`);
              })()
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} 
        className="!w-2.5 !h-2.5 sld-handle-style !bg-emerald-500/90 dark:!bg-emerald-600/90 !border-emerald-600 dark:!border-emerald-500" title="Input/Measurement"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} 
        className="!w-2.5 !h-2.5 sld-handle-style !bg-emerald-500/90 dark:!bg-emerald-600/90 !border-emerald-600 dark:!border-emerald-500" title="Output/Passthrough"/>

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
      
      <div className="flex flex-col items-center justify-between w-full h-full pointer-events-none space-y-1">
        <p className={`text-xs font-semibold text-center truncate w-full leading-tight ${statusUiStyles.textColorClass}`} title={data.label}>
          {data.label}
        </p>

        <div className="relative h-7 w-7 flex items-center justify-center my-0.5">
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${StatusIconComponent.displayName || StatusIconComponent.name}-${processedStatus}`}
                    initial={{ opacity: 0, y: 8, scale: 0.75 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.75, transition: {duration: 0.15, ease: "easeIn"} }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="absolute"
                >
                    <StatusIconComponent 
                        size={28}
                        className={`${statusUiStyles.iconColorClass} transition-colors duration-300`}
                        strokeWidth={ isFaulty || isWarning ? 2.1 : 1.85 }
                    />
                </motion.div>
            </AnimatePresence>
        </div>
        
        <div className="h-4 overflow-hidden"> 
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-[10px] font-medium tracking-tight leading-tight text-center w-full
                                ${statusUiStyles.textColorClass} transition-colors duration-200`}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>

        <div className="flex items-center justify-center space-x-1 mt-auto pt-0.5" title={`Reading: ${meterReadingToDisplay}`}>
             {/* Live indicator for meter reading if linked */}
            {readingOpcUaNodeId && reactiveReadingValue !== undefined && (
                <motion.div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: statusUiStyles.readingColorClass.split(' ')[0] }} // Use the color part
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    title="Live Data"
                />
            )}
            <AnimatePresence mode="popLayout">
                 <motion.p
                    key={`reading-${meterReadingToDisplay}`}
                    className={`text-sm leading-tight text-center whitespace-nowrap 
                                ${statusUiStyles.readingColorClass} transition-colors duration-200`}
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