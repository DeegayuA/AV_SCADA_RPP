// components/sld/nodes/RelayNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseNodeData, CustomNodeType, SLDElementType, DataPointLink } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, getDerivedStyle } from './nodeUtils';
import { 
    ShieldCheckIcon, ShieldAlertIcon, ShieldQuestionIcon, ZapIcon, InfoIcon, ToggleRightIcon, ToggleLeftIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// Helper for theme detection (consistent with PanelNode)
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

interface RelayNodeData extends BaseNodeData {
  elementType: SLDElementType.Relay;
  width?: number;
  height?: number;
  config?: BaseNodeData['config'] & {
    relayType?: string;
    ansiCode?: string;
  };
  dataPointLinks?: DataPointLink[];
}

const RelayNode: React.FC<NodeProps<RelayNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  // Relays often have fixed sizes in diagrams, but allow override if specified.
  const nodeWidthFromData = data.config?.width; // Default to fixed if not provided later.
  const nodeHeightFromData = data.config?.height;

  const isDarkMode = useIsDarkMode();
  const electricCyan = 'hsl(190, 95%, 50%)'; // Consistent selection color

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

  // --- Reactive Data Point Link for Status ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'unknown').toLowerCase(); // Fallback to 'unknown'
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const displayStatusText = useMemo(() => {
    if (['fault', 'alarm', 'tripped'].includes(processedStatus)) return "TRIPPED";
    if (processedStatus === 'warning') return "WARNING";
    if (processedStatus === 'closed' || processedStatus === 'active' || processedStatus === 'on') return "CLOSED"; // Assume "active" for a control relay means closed
    if (processedStatus === 'open' || processedStatus === 'healthy' || processedStatus === 'ready' || processedStatus === 'nominal' || processedStatus === 'off') return "OPEN";
    if (processedStatus === 'unknown' || processedStatus === 'offline') return "OFFLINE"; // Or "UNKNOWN"
    
    return String(processedStatus).toUpperCase();
  }, [processedStatus]);

  const isTrippedOrFault = useMemo(() => ['fault', 'alarm', 'tripped'].includes(processedStatus), [processedStatus]);
  const isWarning = useMemo(() => processedStatus === 'warning', [processedStatus]);
  const isClosedActive = useMemo(() => ['closed', 'active', 'on'].includes(processedStatus), [processedStatus]);
  const isOpenReady = useMemo(() => ['open', 'healthy', 'ready', 'nominal', 'off'].includes(processedStatus), [processedStatus]);

  const StatusIconComponent = useMemo(() => {
    if (isTrippedOrFault) return ShieldAlertIcon;
    if (isWarning) return ShieldAlertIcon; // Could use a different warning icon if available
    if (isClosedActive) return ToggleRightIcon; // Or ZapIcon if preferred for "active"
    if (isOpenReady) return ToggleLeftIcon; // Or ShieldCheckIcon for general "ready"
    return ShieldQuestionIcon; // For offline, unknown
  }, [isTrippedOrFault, isWarning, isClosedActive, isOpenReady]);
  
  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgStartColor = isDarkMode ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.65)'; 
    let baseBgEndColor = isDarkMode ? 'rgba(30, 41, 59, 0.55)' : 'rgba(255, 255, 255, 0.55)';  
    let glowRgb = isDarkMode ? '71, 85, 105' : '148, 163, 184'; // Default slate glow
    let activeGlowIntensity = 0.2;

    if (isTrippedOrFault) {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70';
      iconColorClass = 'text-red-500 dark:text-red-400';
      textColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      glowRgb = '239, 68, 68'; // Red
      activeGlowIntensity = 0.55;
    } else if (isWarning) {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70';
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      textColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      glowRgb = '245, 158, 11'; // Amber
      activeGlowIntensity = 0.45;
    } else if (isClosedActive) { // Relay contact closed / active state
      baseBorderClass = isDarkMode ? 'border-sky-500/70' : 'border-sky-600/80';
      iconColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-500';
      textColorClass = isDarkMode ? 'text-sky-200' : 'text-sky-700';
      glowRgb = isDarkMode ? '56, 189, 248' : '14, 165, 233'; // Sky blue
      activeGlowIntensity = 0.35;
    } else if (isOpenReady) { // Relay contact open / ready / healthy
      baseBorderClass = isDarkMode ? 'border-green-500/70' : 'border-green-600/80';
      iconColorClass = isDarkMode ? 'text-green-400' : 'text-green-500';
      textColorClass = isDarkMode ? 'text-green-300' : 'text-green-600';
      glowRgb = isDarkMode ? '74, 222, 128' : '34, 197, 94'; // Green
      activeGlowIntensity = 0.15; // Subtle glow for ready
    }
    // For 'offline' or 'unknown', default styling applies.

    return { 
        baseBorderClass, iconColorClass, textColorClass, baseBgStartColor, baseBgEndColor,
        glowColor: `rgba(${glowRgb}, ${activeGlowIntensity})`, 
        activeGlowColor: `rgba(${glowRgb}, ${activeGlowIntensity * 1.5})` // Used for breathing animation
    };
  }, [processedStatus, isDarkMode, isTrippedOrFault, isWarning, isClosedActive, isOpenReady]);

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
  
  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    const dynamicBgStyle = {
        '--bg-start-color': statusUiStyles.baseBgStartColor,
        '--bg-end-color': statusUiStyles.baseBgEndColor,
    } as React.CSSProperties;

    let currentBoxShadow = `0 0 7px 1.5px ${statusUiStyles.glowColor}`;
    if ((isTrippedOrFault || isWarning || (isClosedActive && StatusIconComponent === ZapIcon) ) && !selected && !isRecentStatusChange) { // Breaths on critical/active states
      // Framer-motion handles breathing animation based on activeGlowColor
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 13px 3px ${statusUiStyles.glowColor.replace(/[\d\.]+\)$/, '0.65)')}`; // Stronger pulse on change
    }
    if (selected) {
        currentBoxShadow = `0 0 14px 2.5px ${electricCyan}, 0 0 4px 1px ${electricCyan} inset`;
    }
    
    return {
      ...dynamicBgStyle,
      borderColor: derivedNodeStyles.borderColor || statusUiStyles.baseBorderClass.split(' ').pop(),
      boxShadow: currentBoxShadow,
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '85px', // Default width
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '75px', // Default height
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, electricCyan, nodeWidthFromData, nodeHeightFromData, isTrippedOrFault, isWarning, isClosedActive, StatusIconComponent]);
  
  const fullNodeObjectForDetails = useMemo(() => ({
      id, type: type || '', position: nodePosition, 
      data: {
        ...data,
        width: data.width || parseInt(String(nodeMainStyle.width).replace('px', '')),
        height: data.height || parseInt(String(nodeMainStyle.height).replace('px', ''))
      },
      selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
      width: parseInt(String(nodeMainStyle.width).replace('px', '')), 
      height: parseInt(String(nodeMainStyle.height).replace('px', '')),
      connectable: isConnectable || false,
  } as unknown as CustomNodeType), [id, type, nodePosition, data, selected, dragging, zIndex, nodeMainStyle.width, nodeMainStyle.height, isConnectable]);

  const relayDisplayType = data.config?.ansiCode || data.config?.relayType || 'Relay';

  // Should the relay pulse animation be active? (e.g. on trip)
  const shouldPulseAnimate = useMemo(() => (isTrippedOrFault || isWarning), [isTrippedOrFault, isWarning]);

  return (
    <motion.div
      className={`
        relay-node group sld-node relative flex flex-col items-center justify-between 
        rounded-lg border-2 backdrop-blur-sm 
        transition-colors duration-300 ease-in-out
        ${statusUiStyles.baseBorderClass} 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : ''}
        overflow-hidden p-1.5
      `}
      style={{
        ...nodeMainStyle,
        background: `linear-gradient(to bottom, var(--bg-start-color), var(--bg-end-color))`
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
            : `0 0 15px 3.5px ${statusUiStyles.glowColor.replace(/[\d\.]+\)$/, '0.5)')}` // Slightly stronger hover glow
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      {/* Handle styles (colors kept from original, sld-handle-style for common appearance) */}
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-red-500/90 dark:!bg-red-600/90 !border-red-600 dark:!border-red-500" title="Power Input / Monitored Circuit"/>
      <Handle type="target" position={Position.Left} id="ct_pt_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-yellow-500/90 dark:!bg-yellow-600/90 !border-yellow-600 dark:!border-yellow-500" title="Measurement/Sensing Inputs (CT/PT)"/>
      <Handle type="source" position={Position.Right} id="trip_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-orange-500/90 dark:!bg-orange-600/90 !border-orange-600 dark:!border-orange-500" title="Trip/Control Output"/>
      <Handle type="source" position={Position.Bottom} id="comms_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-blue-500/90 dark:!bg-blue-600/90 !border-blue-600 dark:!border-blue-500" title="Communication/Status Output"/>

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
      
      <div className="flex flex-col items-center justify-between w-full h-full pointer-events-none">
        <p className="text-[10px] font-semibold text-center truncate w-full leading-tight -mb-0.5" title={data.label}>
          {data.label}
        </p>

        <div className="relative h-7 w-7 flex items-center justify-center my-0.5"> {/* Icon container */}
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
                        size={28} // Icon size
                        className={`${statusUiStyles.iconColorClass} transition-colors duration-300`}
                        strokeWidth={ (isTrippedOrFault || isWarning) ? 2 : 1.75 }
                    />
                </motion.div>
            </AnimatePresence>
        </div>
        
        <div className="h-3.5 overflow-hidden mt-0.5"> 
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-[9px] font-semibold tracking-tighter leading-tight text-center w-full
                                ${statusUiStyles.textColorClass} transition-colors duration-200`}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        <p className="text-[8px] font-medium text-center truncate w-full leading-tight text-slate-500 dark:text-slate-400 mt-auto" title={relayDisplayType}>
            {relayDisplayType}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(RelayNode);