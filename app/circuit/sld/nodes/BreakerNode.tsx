// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BreakerNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ZapOffIcon, ZapIcon, ShieldAlertIcon, ShieldCheckIcon, AlertTriangleIcon, InfoIcon, PowerIcon } from 'lucide-react';
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

const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;

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
  
  // Handles breaker.isOpen or the more generic isOpen
  const isOpenLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isOpen' || link.targetProperty === 'breaker.isOpen'), [data.dataPointLinks]);
  const isOpenDataPointConfig = useMemo(() => isOpenLink ? dataPoints[isOpenLink.dataPointId] : undefined, [isOpenLink, dataPoints]);
  const isOpenOpcUaNodeId = useMemo(() => isOpenDataPointConfig?.nodeId, [isOpenDataPointConfig]);
  const reactiveIsOpenValue = useOpcUaNodeValue(isOpenOpcUaNodeId);

  // --- Processed States ---
  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const isBreakerOpen = useMemo(() => {
    if (isOpenLink && isOpenDataPointConfig && reactiveIsOpenValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsOpenValue, isOpenLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || String(mappedValue).toLowerCase() === 'open' || Number(mappedValue) === 1;
    }
    // Fallback based on processedStatus or static config
    if (processedStatus === 'open' || processedStatus === 'tripped') return true;
    if (processedStatus === 'closed' || processedStatus === 'nominal' || processedStatus === 'energized') return false;
    
    // Default to normally open if configured, otherwise default to closed if status unknown
    return data.config?.normallyOpen ?? false; 
  }, [isOpenLink, isOpenDataPointConfig, reactiveIsOpenValue, processedStatus, data.config?.normallyOpen]);

  // Descriptive status text for UI
  const displayStatusText = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'tripped') return "TRIPPED / FAULT";
    if (processedStatus === 'alarm') return "ALARM";
    if (processedStatus === 'warning') return "WARNING";
    if (isBreakerOpen && (processedStatus === 'offline' || processedStatus === 'open')) return "OFFLINE / OPEN";
    if (!isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal' || processedStatus === 'energized')) return "NOMINAL";
    if (processedStatus === 'standby') return "STANDBY";
    return String(processedStatus).toUpperCase(); // Default
  }, [processedStatus, isBreakerOpen]);
  
  // Centralized UI styling based on state
  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500'; // For SVG
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600'; // For status text
    let baseBgStartColor = isDarkMode ? 'rgba(51, 65, 85, 0.75)' : 'rgba(248, 250, 252, 0.75)';
    let baseBgEndColor = isDarkMode ? 'rgba(51, 65, 85, 0.65)' : 'rgba(248, 250, 252, 0.65)';
    let glowRgb = isDarkMode ? '100, 116, 139' : '148, 163, 184'; // Neutral Slate
    let mainStatusColorClass = textColorClass; // For "OPEN"/"CLOSED" text

    if (processedStatus === 'fault' || processedStatus === 'tripped' || processedStatus === 'alarm') {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70';
      iconColorClass = 'text-red-500 dark:text-red-400';
      textColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      mainStatusColorClass = iconColorClass;
      glowRgb = '239, 68, 68'; // Red
    } else if (processedStatus === 'warning') {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70';
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      textColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      mainStatusColorClass = iconColorClass;
      glowRgb = '245, 158, 11'; // Amber
    } else if (!isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal' || processedStatus === 'energized')) { // Closed and healthy
      baseBorderClass = 'border-green-600/80 dark:border-green-500/70';
      iconColorClass = 'text-green-600 dark:text-green-500';
      textColorClass = 'text-green-700 dark:text-green-400';
      mainStatusColorClass = iconColorClass;
      glowRgb = '34, 197, 94'; // Green
    } else if (isBreakerOpen) { // Open, potentially offline
      // Uses default slate border, but specific icon/text color if needed
      iconColorClass = isDarkMode ? 'text-sky-400' : 'text-sky-500'; // Blue-ish for open/disconnected
      mainStatusColorClass = iconColorClass;
      // glowRgb remains slate for open/offline unless a more specific 'offline' glow is desired
    }
    
    return { 
        baseBorderClass, iconColorClass, textColorClass, baseBgStartColor, baseBgEndColor, mainStatusColorClass,
        glowColor: `rgba(${glowRgb}, 0.45)`,
        activeGlowColor: `rgba(${glowRgb}, ${(!isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal')) ? 0.35 : 0})`, // Breathing glow when closed & nominal
    };
  }, [processedStatus, isBreakerOpen, isDarkMode]);

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
    const isNominalClosed = !isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal');
    
    if (isNominalClosed && !selected && !isRecentStatusChange) {
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
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '70px', // Default width
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '95px', // Default height
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, isBreakerOpen, processedStatus, electricCyan, nodeWidthFromData, nodeHeightFromData]);

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || '', position: nodePosition, data,
    selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
    width: nodeWidthFromData, height: nodeHeightFromData,
    connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);
  
  const breakerTypeLabel = data.config?.type || 'Breaker';
  const tripRatingText = data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel.toUpperCase();

  return (
    <motion.div
      className={`
        breaker-node group sld-node relative flex flex-col items-center justify-between 
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
        boxShadow: (!isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal') && !selected && !isRecentStatusChange)
          ? [ 
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`,
              `0 0 12px 2.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.5')}`,
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        (!isBreakerOpen && (processedStatus === 'closed' || processedStatus === 'nominal') && !selected && !isRecentStatusChange)
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
        type="target" position={Position.Top} id="top_in" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-500/80 dark:!bg-slate-600/80 !border-slate-600 dark:!border-slate-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="Input"
      />
      <Handle 
        type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-500/80 dark:!bg-slate-600/80 !border-slate-600 dark:!border-slate-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="Output"
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
        {/* Top status text (optional, small) */}
        <div className="h-3 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={`desc-status-${displayStatusText}`}
                    className={`text-[8px] font-medium tracking-tight leading-tight text-center w-full ${statusUiStyles.textColorClass} transition-colors duration-200`}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        {/* Breaker Label */}
        <motion.p
          className="text-xs font-bold leading-tight text-center w-full text-slate-800 dark:text-slate-100 transition-colors duration-200"
          title={`${data.label} (${breakerTypeLabel})`}
        >
          {data.label}
        </motion.p>

        {/* SVG Breaker Visual */}
        <motion.svg 
          viewBox="0 0 24 24" 
          width="30" height="30" 
          className="flex-shrink-0 my-0.5" 
          style={{ color: statusUiStyles.iconColorClass }}
          initial={false}
          animate={{ color: statusUiStyles.iconColorClass }} // Animate color change if needed
          transition={{duration: 0.3}}
        >
          {/* Terminals */}
          <circle cx="12" cy="6" r="2.2" fill="currentColor" />
          <circle cx="12" cy="18" r="2.2" fill="currentColor" />
          {/* Static connection from top terminal to center body */}
          <line x1="12" y1="8.2" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          {/* Animated Breaker Arm */}
          <motion.line
            key={isBreakerOpen ? "breaker-open-arm" : "breaker-closed-arm"}
            x1="12" y1="12.5" /* Start point fixed slightly below center */
            initial={false}
            animate={isBreakerOpen 
                ? { x2: 18, y2: 9, strokeWidth: 2 } // Open state: angled, slightly thinner
                : { x2: 12, y2: 15.8, strokeWidth: 2.2 } // Closed state: vertical to bottom terminal, slightly thicker
            }
            transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.25 }}
            stroke="currentColor"
            strokeLinecap="round"
          />
          {/* Center Body/Housing of the breaker arm pivot point */}
          <rect x="9" y="10.5" width="6" height="3" rx="1" fill="currentColor" className="opacity-70" />
          {/* Connection point for closed state (hidden when open) */}
           <motion.circle 
            cx="12" cy="12.5" r="1.2" 
            fill={isDarkMode ? "hsl(220,13%,25%)" : "hsl(220,13%,85%)"} // Darker/Lighter center dot
            initial={{ opacity: isBreakerOpen ? 0 : 1 }}
            animate={{ opacity: isBreakerOpen ? 0 : 1 }}
            transition={{ duration: 0.1 }}
          />
        </motion.svg>

        {/* Main Open/Closed Status */}
        <div className="h-4 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={`main-status-${isBreakerOpen}`}
                    className={`text-sm font-semibold leading-tight text-center w-full ${statusUiStyles.mainStatusColorClass} transition-colors duration-200`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {isBreakerOpen ? 'OPEN' : 'CLOSED'}
                </motion.p>
            </AnimatePresence>
        </div>

        {/* Trip Rating / Type */}
        <p className="text-[9px] text-muted-foreground dark:text-slate-400/80 text-center truncate w-full leading-tight font-medium" title={tripRatingText}>
          {tripRatingText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(BreakerNode);