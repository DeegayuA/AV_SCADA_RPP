// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { 
    SunIcon, AlertTriangleIcon, InfoIcon, ZapOffIcon, PowerIcon, TrendingUpIcon, CloudIcon, CloudSunIcon,
    CloudFogIcon, ActivityIcon // Using Activity for live dot, TrendingDown for negative
} from 'lucide-react'; 
import { Button } from "@/components/ui/button";

// Helper for theme detection (remains the same)
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

const PanelNode: React.FC<NodeProps<PanelNodeData>> = (props) => {
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
  const productionRatio = useMemo(() => {
    if (powerRatingWp && powerRatingWp > 0 && currentNumericPower !== undefined) {
      return Math.max(0, Math.min(1, currentNumericPower / powerRatingWp)); // Cap at 0-1 for intensity
    }
    return numericAnimationPower > 0 ? 0.5 : 0; // Default if no rating or current power for ratio
  }, [currentNumericPower, powerRatingWp, numericAnimationPower]);

  // WOW: More descriptive status text
  const displayStatusText = useMemo(() => {
    if (['fault', 'alarm'].includes(processedStatus)) return "FAULT";
    if (processedStatus === 'warning') return "WARNING";
    if (processedStatus === 'offline') return "OFFLINE";
    if (processedStatus === 'standby') return "STANDBY";

    if (currentNumericPower !== undefined) {
        if (currentNumericPower < 0) return "CONSUMING"; // Or more specific error
        if (powerRatingWp && currentNumericPower < (powerRatingWp * 0.05) && currentNumericPower > 0) return "VERY LOW"; // less than 5%
        if (powerRatingWp && currentNumericPower < (powerRatingWp * 0.3)) return "LOW YIELD"; // less than 30%
        if (currentNumericPower > 0) return "PRODUCING";
    }
    // If nominal/online but zero power and not covered above
    if (['nominal', 'online', 'producing'].includes(processedStatus) && numericAnimationPower <=0) return "IDLE / NIGHT";

    return String(processedStatus).toUpperCase();
  }, [processedStatus, currentNumericPower, powerRatingWp, numericAnimationPower]);

  // WOW: Advanced Icon Logic
  const StatusIconComponent = useMemo(() => {
    if (['fault', 'alarm'].includes(processedStatus)) return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if (processedStatus === 'offline' || (processedStatus === 'standby' && numericAnimationPower <= 0)) return ZapOffIcon;

    if (currentNumericPower !== undefined) {
      if (currentNumericPower < 0) return AlertTriangleIcon; // Negative power implies an issue, using Alert for now
      if (powerRatingWp && currentNumericPower < (powerRatingWp * 0.05) && currentNumericPower >= 0) return CloudFogIcon; // Very low
      if (powerRatingWp && currentNumericPower < (powerRatingWp * 0.3)) return CloudSunIcon; // Low
      if (currentNumericPower > 0) return SunIcon;
    }
    
    // If online/nominal but zero power for animation, and not already handled
    if (['nominal', 'online', 'producing'].includes(processedStatus) && numericAnimationPower <=0) return CloudIcon;

    return PowerIcon; // Default / standby ready
  }, [processedStatus, currentNumericPower, numericAnimationPower, powerRatingWp]);
  
  const isProducingPositive = useMemo(() => currentNumericPower !== undefined && currentNumericPower > 0 && StatusIconComponent === SunIcon, [currentNumericPower, StatusIconComponent]);

  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80'; // Adjusted from Inverter
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgStartColor = isDarkMode ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.75)'; 
    let baseBgEndColor = isDarkMode ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.65)';  
    let glowRgb = isDarkMode ? '71, 85, 105' : '148, 163, 184'; // Default glow
    let activeGlowRgb = glowRgb;
    let powerTextColorClass = isDarkMode ? 'text-slate-200' : 'text-slate-700';
    let powerIconColorClass = powerTextColorClass;


    if (['fault', 'alarm'].includes(processedStatus) || (currentNumericPower !== undefined && currentNumericPower < 0 && StatusIconComponent === AlertTriangleIcon) ) {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70';
      iconColorClass = 'text-red-500 dark:text-red-400';
      textColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      glowRgb = '239, 68, 68';
      powerTextColorClass = iconColorClass; 
      powerIconColorClass = iconColorClass;
    } else if (processedStatus === 'warning') {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70';
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      textColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      glowRgb = '245, 158, 11';
      powerTextColorClass = iconColorClass;
      powerIconColorClass = iconColorClass;
    } else if (isProducingPositive) { // Actively producing with SunIcon
      baseBorderClass = isDarkMode ? 'border-yellow-400/70' : 'border-yellow-500/80';
      iconColorClass = isDarkMode ? `text-yellow-300` : `text-yellow-500`;
      textColorClass = isDarkMode ? 'text-yellow-200' : 'text-yellow-700';
      glowRgb = isDarkMode ? '250, 204, 21' : '234, 179, 8'; // Yellow glow for production
      powerTextColorClass = iconColorClass; // Make power text also yellow
      powerIconColorClass = iconColorClass;
    } else if (StatusIconComponent === CloudSunIcon || StatusIconComponent === CloudFogIcon) { // Low production states
      baseBorderClass = isDarkMode ? 'border-sky-600/60' : 'border-sky-400/70';
      iconColorClass = isDarkMode ? 'text-sky-400' : 'text-sky-500';
      textColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-600';
      glowRgb = isDarkMode ? '56, 189, 248' : '14, 165, 233'; // Blue-ish glow for cloudy
      powerTextColorClass = iconColorClass;
      powerIconColorClass = iconColorClass;
    } else if (StatusIconComponent === CloudIcon || StatusIconComponent === ZapOffIcon || StatusIconComponent === PowerIcon) { // Idle, offline, standby
       // Keep default border, icon, text color for these
    }
    activeGlowRgb = glowRgb; // activeGlowRgb typically matches the primary status glow

    return { 
        baseBorderClass, iconColorClass, textColorClass, baseBgStartColor, baseBgEndColor,
        glowColor: `rgba(${glowRgb}, 0.4)`, // Slightly stronger base glow for panels
        activeGlowColor: `rgba(${activeGlowRgb}, ${isProducingPositive ? 0.3 : 0})`, // Breathing glow only when actively producing well
        powerTextColorClass, powerIconColorClass
    };
  }, [processedStatus, isDarkMode, StatusIconComponent, currentNumericPower, isProducingPositive]);


  // WOW: Animation speed for sun pulse
  const animationPulseDuration = useMemo(() => { 
    if (!isProducingPositive) return 2.5; // Default for non-sun or non-pulsing states
    const baseDuration = 3.0; // Slower base for a gentler pulse
    const minDuration = 0.4;  // Faster minimum for high power
    // Scale speed based on productionRatio (0 to 1)
    // Higher ratio = faster pulse (smaller duration)
    const speedFactor = productionRatio * 2.5; // Amplified effect of ratio
    return Math.max(minDuration, baseDuration / (1 + speedFactor));
  }, [isProducingPositive, productionRatio]);


  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(displayStatusText); // Track displayStatusText for change pulse
  useEffect(() => {
    if (prevDisplayStatusRef.current !== displayStatusText) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevDisplayStatusRef.current = displayStatusText;
      return () => clearTimeout(timer);
    }
  }, [displayStatusText]);
  

  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);
  const electricCyan = 'hsl(190, 95%, 50%)';

  // Consistent with InverterNode styling logic
  const nodeMainStyle = useMemo((): React.CSSProperties => {
    const dynamicBgStyle = {
        '--bg-start-color': statusUiStyles.baseBgStartColor,
        '--bg-end-color': statusUiStyles.baseBgEndColor,
    } as React.CSSProperties;

    let currentBoxShadow = `0 0 7px 1.5px ${statusUiStyles.glowColor}`; // Base glow
    if (isProducingPositive && !selected && !isRecentStatusChange) {
      // For breathing glow (handled by framer-motion animate prop)
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 13px 3px ${statusUiStyles.glowColor.replace('0.4', '0.65')}`; 
    }
    if (selected) {
        currentBoxShadow = `0 0 14px 2.5px ${electricCyan}, 0 0 4px 1px ${electricCyan} inset`;
    }
    
    return {
      ...dynamicBgStyle,
      borderColor: derivedNodeStyles.borderColor || statusUiStyles.baseBorderClass.split(' ').pop(),
      boxShadow: currentBoxShadow,
      minWidth: '120px', // Slightly wider to accommodate more info
      minHeight: '100px', // Slightly taller
      ...(typeof nodeWidthFromData === 'number' && { width: `${nodeWidthFromData}px` }),
      ...(typeof nodeHeightFromData === 'number' && { height: `${nodeHeightFromData}px` }),
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, isProducingPositive, electricCyan, nodeWidthFromData, nodeHeightFromData]);
  
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
        ${statusUiStyles.baseBorderClass} 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : ''}
        overflow-hidden 
      `}
      style={{
        ...nodeMainStyle,
        background: `linear-gradient(to bottom, var(--bg-start-color), var(--bg-end-color))`
      }}
      initial={{ opacity: 0, scale: 0.88, y: 18 }} // Slightly different entry
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: isProducingPositive && !selected && !isRecentStatusChange 
          ? [ // Breathing glow animation for positive production
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.3', '0.25')}`,
              `0 0 12px 2.5px ${statusUiStyles.activeGlowColor.replace('0.3', '0.45')}`,
              `0 0 8px 1.5px ${statusUiStyles.activeGlowColor.replace('0.3', '0.25')}`
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        isProducingPositive && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 280, damping: 25 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.035 : 1.02, // Slightly more pronounced hover
        boxShadow: selected 
            ? `0 0 18px 3.5px ${electricCyan}, 0 0 6px 1.5px ${electricCyan} inset`
            : `0 0 15px 3.5px ${statusUiStyles.glowColor.replace('0.4', '0.6')}`
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      {/* Consistent Handle Styling with InverterNode */}
      <Handle // DC Input (Top) - Assuming Panels are typically sources, but can have inputs in daisy chains
        type="target" position={Position.Top} id="top_in" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-500/80 dark:!bg-slate-600/80 !border-slate-600 dark:!border-slate-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="DC Input"
      />
      <Handle // DC Output (Bottom)
        type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-yellow-500/90 dark:!bg-yellow-600/90 !border-yellow-600 dark:!border-yellow-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="DC Output"
      >
         {/* WOW: Output handle could subtly indicate power flow with color or an icon (future) */}
      </Handle>

      {/* Consistent Info Button with InverterNode */}
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
      
      <div className="flex flex-col items-center justify-between w-full h-full px-2 py-1.5 space-y-1 pointer-events-none">
        <div className="relative h-8 w-8 flex items-center justify-center"> {/* Icon container */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${StatusIconComponent.displayName || StatusIconComponent.name}-${processedStatus}`} // More specific key
                    initial={{ opacity: 0, y: 10, scale: 0.7 }}
                    animate={{ 
                        opacity: 1, y: 0, scale: 1,
                        // WOW: Dynamic icon brightness based on productionRatio for SunIcon
                        filter: StatusIconComponent === SunIcon && isProducingPositive ? `brightness(${0.8 + productionRatio * 0.7}) saturate(${1 + productionRatio * 0.5})` : 'none',
                     }}
                    exit={{ opacity: 0, y: -10, scale: 0.7, transition: {duration: 0.15, ease: "easeIn"} }}
                    transition={{ 
                        type: 'spring', stiffness:200, damping:15,
                        filter: { duration: 0.5 } // Smooth brightness transition
                    }}
                    className="absolute"
                >
                    <StatusIconComponent 
                        size={26} // Slightly larger icon
                        className={`${statusUiStyles.iconColorClass} transition-colors duration-300`}
                        strokeWidth={
                            StatusIconComponent === AlertTriangleIcon ? 2.2 : 
                            (StatusIconComponent === SunIcon && isProducingPositive ? 1.8 + (productionRatio * 0.5) : 1.75) // Dynamic stroke for sun
                        }
                        // WOW: Attempt to change fill opacity of sun icon - might need custom SVG to truly control parts
                        // fillOpacity={StatusIconComponent === SunIcon && isProducingPositive ? 0.5 + productionRatio * 0.5 : 1}
                    />
                </motion.div>
            </AnimatePresence>
            {/* WOW: Sun ray pulse for SunIcon */}
            {StatusIconComponent === SunIcon && isProducingPositive && (
                <motion.div
                    className="absolute inset-[-4px] rounded-full" // Larger pulse radius
                    style={{ // More elaborate pulse using box-shadow for a softer, multi-layered feel
                        boxShadow: `0 0 ${6 + productionRatio * 10}px ${2 + productionRatio * 3}px ${isDarkMode ? 'rgba(250, 204, 21, 0.2)' : 'rgba(234, 179, 8, 0.15)' }`
                    }}
                    animate={{ 
                        scale: [1, 1.05 + productionRatio * 0.25, 1], 
                        opacity: [0.3 + productionRatio * 0.3, 0.5 + productionRatio * 0.5, 0.3 + productionRatio * 0.3]
                    }}
                    transition={{ duration: animationPulseDuration, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
        
        {/* Animated Detailed Status Text */}
        <div className="h-4 overflow-hidden mt-0.5"> 
            <AnimatePresence mode="wait">
                <motion.p
                    key={`status-${displayStatusText}`}
                    className={`text-xs font-semibold tracking-tight leading-tight text-center w-full
                                ${statusUiStyles.textColorClass} transition-colors duration-200`}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        {/* Panel Label */}
        <motion.p
          className={`text-sm font-bold leading-tight text-center w-full
                     text-slate-800 dark:text-slate-100 transition-colors duration-200 mt-0.5`}
          title={data.label}
        >
          {data.label}
        </motion.p>

        {/* Power Display with Context & Live Indicator */}
        <div className="flex items-center justify-center space-x-1 text-xs font-medium mt-auto" title={`Power: ${formattedPowerOutputWithContext}`}>
            <TrendingUpIcon 
                size={12} 
                className={`${statusUiStyles.powerIconColorClass} transition-colors duration-200 
                            ${currentNumericPower !== undefined && currentNumericPower < 0 ? 'transform rotate-180 text-blue-500 dark:text-blue-400' : ''}`} 
            />
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={`power-${formattedPowerOutputWithContext}`}
                    className={`${statusUiStyles.powerTextColorClass} font-semibold transition-colors duration-200`}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4, transition:{duration:0.1} }} 
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {/* WOW: Split current and rated power for distinct styling if needed later */}
                    {formattedPowerOutputWithContext.split(" / ")[0]}
                    {formattedPowerOutputWithContext.includes(" / ") && (
                        <span className="text-[10px] opacity-70 dark:opacity-60"> / {formattedPowerOutputWithContext.split(" / ")[1]}</span>
                    )}
                </motion.span>
            </AnimatePresence>
            {/* WOW: Live indicator if power dataPoint is linked */}
            {powerOpcUaNodeId && currentNumericPower !== undefined && (
                <motion.div 
                    className="w-1.5 h-1.5 rounded-full ml-0.5"
                    style={{ backgroundColor: statusUiStyles.powerIconColorClass }}
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