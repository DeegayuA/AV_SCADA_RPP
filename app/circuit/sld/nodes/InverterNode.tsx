// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { InverterNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { 
    ZapIcon as DefaultZapIcon, // Renamed to avoid conflict if ZapIcon from lucide is used directly
    RefreshCwIcon, AlertTriangleIcon, InfoIcon, 
    ArrowDown01Icon, ArrowUp01Icon, ThermometerIcon, ActivityIcon,
    ChevronRightIcon, SlidersHorizontalIcon, ZapOffIcon, PowerIcon 
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

const InverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex,
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

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput' || link.targetProperty === 'inverter.powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);
  
  const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
  const tempDpConfig = useMemo(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
  const tempOpcUaNodeId = useMemo(() => tempDpConfig?.nodeId, [tempDpConfig]);
  const reactiveTempValue = useOpcUaNodeValue(tempOpcUaNodeId);
  
  const hasAnyAcDetailLinks = useMemo(() => {
    const acDetailProps = [
        'voltageL1', 'voltageL2', 'voltageL3', 
        'currentL1', 'currentL2', 'currentL3', 
        'frequencyL1', 'frequencyL2', 'frequencyL3', 'frequency'
    ];
    return data.dataPointLinks?.some(link => acDetailProps.includes(link.targetProperty)) || false;
  }, [data.dataPointLinks]);

  // --- Processed Values ---
  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const currentNumericAcPower = useMemo(() => {
    let powerVal: number | undefined = undefined;
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mapped = applyValueMapping(reactivePowerValue, powerLink);
      if (typeof mapped === 'number') powerVal = mapped;
      else if (typeof mapped === 'string') { const p = parseFloat(mapped); if (!isNaN(p)) powerVal = p; }
    }
    // If linked but no value yet, treat as undefined to show "---". If not linked at all, treat as 0 or use rated as placeholder logic.
    // For this component, if there's a link but no value, it means "waiting for data".
    // If no link, it might be unconfigured or truly zero. For simplicity, we only calculate if linked.
    return powerVal;
  }, [powerLink, powerDataPointConfig, reactivePowerValue]);

  const ratedPowerKw = useMemo(() => data.config?.ratedPower, [data.config?.ratedPower]);
  
  // Is considered active if status is one of the active ones AND power is not negative (consuming)
  const isDeviceActive = useMemo(() => 
    ['running', 'online', 'nominal', 'active', 'inverting'].includes(processedStatus) && 
    (currentNumericAcPower === undefined || currentNumericAcPower >= 0), // Undefined power still counts as active if status says so
  [processedStatus, currentNumericAcPower]);

  const acPowerRatio = useMemo(() => { // Used for animation intensity, 0 to 1
    if (ratedPowerKw && ratedPowerKw > 0 && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) {
      return Math.min(1, currentNumericAcPower / ratedPowerKw);
    }
    return 0; // Default to 0 if no rated power or current power for ratio calculation
  }, [currentNumericAcPower, ratedPowerKw]);

  const displayStatusText = useMemo(() => {
    if (['fault', 'alarm'].includes(processedStatus)) return "FAULT";
    if (processedStatus === 'warning') return "WARNING";
    if (processedStatus === 'offline') return "OFFLINE";
    if (processedStatus === 'standby' || processedStatus === 'idle') return "STANDBY";
    if (isDeviceActive) return "ACTIVE"; // General active state
    // Fallback to uppercased processedStatus if none of the above match
    return String(processedStatus).toUpperCase();
  }, [processedStatus, isDeviceActive]);

  const temperatureValue = useMemo(() => {
    if (!tempLink || reactiveTempValue === undefined) return null; // Ensure reactiveTempValue is defined
    const mappedValue = applyValueMapping(reactiveTempValue, tempLink);
    if (typeof mappedValue === 'number') return mappedValue;
    const parsed = parseFloat(String(mappedValue));
    return isNaN(parsed) ? null : parsed;
  }, [reactiveTempValue, tempLink]);

  const formattedTemperature = useMemo(() => {
    if (temperatureValue !== null && tempLink && tempDpConfig) {
      return formatDisplayValue(temperatureValue, tempLink.format, tempDpConfig.dataType);
    }
    return null;
  }, [temperatureValue, tempLink, tempDpConfig]);

  const tempStatus = useMemo(() => { // For styling temperature
    if (temperatureValue === null) return 'normal';
    const warnTemp = data.config?.warningTemperature ?? 55; // Example default
    const maxTemp = data.config?.maxOperatingTemperature ?? 70; // Example default
    if (maxTemp && temperatureValue >= maxTemp) return 'critical';
    if (warnTemp && temperatureValue >= warnTemp) return 'warning';
    return 'normal';
  }, [temperatureValue, data.config]);

  const StatusIconComponent = useMemo(() => {
    if (['fault', 'alarm'].includes(processedStatus)) return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if (processedStatus === 'offline') return ZapOffIcon;
    if (processedStatus === 'standby' || processedStatus === 'idle') return PowerIcon; // Using PowerIcon for standby
    if (isDeviceActive) return RefreshCwIcon; // Main active icon
    return DefaultZapIcon; // Default for other states
  }, [processedStatus, isDeviceActive]);
  
  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-600/70' : 'border-slate-300/80';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let statusTextColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgStartColor = isDarkMode ? 'rgba(51, 65, 85, 0.78)' : 'rgba(248, 250, 252, 0.78)'; // Darker for inverter body
    let baseBgEndColor = isDarkMode ? 'rgba(51, 65, 85, 0.68)' : 'rgba(248, 250, 252, 0.68)';   
    let glowRgb = isDarkMode ? '100, 116, 139' : '148, 163, 184'; // Neutral slate glow
    let activeGlowRgb = glowRgb;
    
    // Power text colors based on active state more than fault state
    let powerColorClass = isDeviceActive 
        ? (isDarkMode ? 'text-sky-300' : 'text-sky-600') 
        : (isDarkMode ? 'text-slate-400' : 'text-slate-500');
    let powerIconColorClass = powerColorClass;

    let tempColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let tempIconColorClass = tempColorClass;
    
    let acDetailsIconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    
    if (['fault', 'alarm'].includes(processedStatus)) {
      baseBorderClass = 'border-red-500/80 dark:border-red-500/70'; 
      iconColorClass = 'text-red-500 dark:text-red-400';
      statusTextColorClass = 'text-red-600 dark:text-red-400 font-semibold';
      glowRgb = '239, 68, 68'; // Red glow
      // For fault/alarm, power/temp texts also take on error color
      powerColorClass = iconColorClass; 
      powerIconColorClass = iconColorClass;
      tempColorClass = iconColorClass;
      tempIconColorClass = iconColorClass;
      acDetailsIconColorClass = iconColorClass;
    } else if (processedStatus === 'warning') {
      baseBorderClass = 'border-amber-500/80 dark:border-amber-400/70'; 
      iconColorClass = 'text-amber-500 dark:text-amber-400';
      statusTextColorClass = 'text-amber-600 dark:text-amber-400 font-medium';
      glowRgb = '245, 158, 11'; // Amber glow
      // For warning, power/temp texts also take on warning color
      powerColorClass = iconColorClass;
      powerIconColorClass = iconColorClass;
      tempColorClass = iconColorClass;
      tempIconColorClass = iconColorClass;
      acDetailsIconColorClass = iconColorClass;
    } else if (isDeviceActive) {
      baseBorderClass = 'border-sky-500/80 dark:border-sky-400/70'; 
      iconColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-500';
      statusTextColorClass = isDarkMode ? 'text-sky-200' : 'text-sky-600';
      glowRgb = isDarkMode ? '56, 189, 248' : '14, 165, 233'; // Sky blue glow
      // Dynamic power color brightness based on ratio already handled for powerColorClass
      acDetailsIconColorClass = iconColorClass; 
    }
    // Active glowRgb should be the one for the current state
    activeGlowRgb = glowRgb; 

    // Temperature specific styling (can override fault/warning if critical/warning temp)
    if (tempStatus === 'critical' && !['fault', 'alarm'].includes(processedStatus)) { 
      tempColorClass = isDarkMode ? 'text-red-400' : 'text-red-500'; 
      tempIconColorClass = tempColorClass; 
    } else if (tempStatus === 'warning' && !['fault', 'alarm', 'warning'].includes(processedStatus)) { 
      tempColorClass = isDarkMode ? 'text-amber-400' : 'text-amber-500'; 
      tempIconColorClass = tempColorClass;
    }

    return { 
        baseBorderClass, iconColorClass, statusTextColorClass, baseBgStartColor, baseBgEndColor,
        glowColor: `rgba(${glowRgb}, 0.45)`, 
        activeGlowColor: `rgba(${activeGlowRgb}, ${isDeviceActive ? 0.35 : 0})`, // Breathing glow only when active
        powerColorClass, powerIconColorClass, tempColorClass, tempIconColorClass, acDetailsIconColorClass
    };
  }, [processedStatus, isDarkMode, isDeviceActive, tempStatus, acPowerRatio]); // Removed currentNumericAcPower to avoid re-calc if only power value changes but active state remains.

  const animationRotateDuration = useMemo(() => {
    if (!isDeviceActive || StatusIconComponent !== RefreshCwIcon) return 0; // No rotation if not active or not the Refresh icon
    const baseDuration = 10; // Slower base rotation
    const minDuration = 1.5;  // Faster minimum for high power
    const maxDuration = 12; // Slower maximum for zero/low power or if undefined
    if (currentNumericAcPower === undefined || currentNumericAcPower <= 0) return maxDuration;
    // Scale speed based on acPowerRatio (0 to 1)
    // Higher ratio = faster rotation (smaller duration)
    return Math.max(minDuration, baseDuration / (1 + acPowerRatio * 3)); // Apply factor to ratio effect
  }, [currentNumericAcPower, acPowerRatio, isDeviceActive, StatusIconComponent]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(displayStatusText);
  useEffect(() => {
    if (prevDisplayStatusRef.current !== displayStatusText) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200); 
      prevDisplayStatusRef.current = displayStatusText; return () => clearTimeout(timer);
    }
  }, [displayStatusText]);

  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);
  const electricCyan = 'hsl(190, 95%, 50%)'; 

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    const dynamicBgStyle = { 
        '--bg-start-color': statusUiStyles.baseBgStartColor, 
        '--bg-end-color': statusUiStyles.baseBgEndColor 
    } as React.CSSProperties;

    let currentBoxShadow = `0 0 8px 1.8px ${statusUiStyles.glowColor}`; // Base glow
    if (isDeviceActive && !selected && !isRecentStatusChange) {
      // Breathing glow handled by framer-motion animate prop
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 14px 3.5px ${statusUiStyles.glowColor.replace('0.45', '0.7')}`; // Stronger pulse for status change
    }
    if (selected) {
        currentBoxShadow = `0 0 16px 3px ${electricCyan}, 0 0 5px 1.5px ${electricCyan} inset`;
    }
    
    return {
      ...dynamicBgStyle, 
      borderColor: derivedNodeStyles.borderColor || statusUiStyles.baseBorderClass.split(' ').pop(), // Get the actual color name
      boxShadow: currentBoxShadow, 
      minWidth: '130px', 
      minHeight: hasAnyAcDetailLinks ? '120px' : '100px', // Keep adjusted height
      ...(nodeWidthFromData && { width: `${nodeWidthFromData}px` }), 
      ...(nodeHeightFromData && { height: `${nodeHeightFromData}px` }),
    };
  }, [statusUiStyles, derivedNodeStyles, selected, isRecentStatusChange, isDeviceActive, electricCyan, nodeWidthFromData, nodeHeightFromData, hasAnyAcDetailLinks]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || '', position: nodePosition, data, selected: selected || false, 
    dragging: dragging || false, zIndex: zIndex || 0, width: nodeWidthFromData, 
    height: nodeHeightFromData, connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

  const formattedAcPowerOutputWithContext = useMemo(() => {
    const powerStr = (currentNumericAcPower !== undefined) 
      ? `${currentNumericAcPower.toFixed(currentNumericAcPower < 10 && currentNumericAcPower !== 0 ? 1 : 0)}kW` // Decimal for small non-zero
      : (powerLink ? "--- kW" : (ratedPowerKw ? "Rated" : "N/A"));

    if (ratedPowerKw) {
      return powerStr === "Rated" ? `${ratedPowerKw.toFixed(1)}kW (Rated)` : `${powerStr} / ${ratedPowerKw.toFixed(1)}kW`;
    }
    return powerStr;
  }, [currentNumericAcPower, ratedPowerKw, powerLink]);

  const handleDetailsClick = (e: React.MouseEvent) => { 
      if (!isNodeEditable && !isEditMode) { 
          e.stopPropagation(); 
          setSelectedElementForDetails(fullNodeObjectForDetails); 
      }
  };

  return (
    <motion.div
      className={`
        inverter-node group sld-node relative flex flex-col items-center 
        rounded-lg border backdrop-blur-sm 
        transition-all duration-300 ease-in-out
        ${statusUiStyles.baseBorderClass} 
        ${isNodeEditable ? 'cursor-grab' : (hasAnyAcDetailLinks || !isEditMode ? 'cursor-pointer' : 'cursor-default')} 
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-black/10 dark:ring-offset-white/10 shadow-xl` : 'shadow-md'} 
        overflow-hidden
      `}
      style={{ 
        ...nodeMainStyle, 
        background: `linear-gradient(to bottom, var(--bg-start-color), var(--bg-end-color))`
      }}
      initial={{ opacity: 0, scale: 0.88, y: 18 }} 
      animate={{ 
          opacity: 1, scale: 1, y: 0, height: nodeMainStyle.height, // Animate height if it changes
          boxShadow: isDeviceActive && !selected && !isRecentStatusChange 
            ? [ // Breathing glow animation for active state
                `0 0 9px 2px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`, 
                `0 0 14px 3px ${statusUiStyles.activeGlowColor.replace('0.35', '0.5')}`, 
                `0 0 9px 2px ${statusUiStyles.activeGlowColor.replace('0.35', '0.3')}`
              ]
            : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, scale: 0.82, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={
        isDeviceActive && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: 2.0, repeat: Infinity, ease: "easeInOut" }, height: {type: "spring", stiffness: 180, damping: 22} } 
          : { type: 'spring', stiffness: 280, damping: 25, height: {type: "spring", stiffness: 180, damping: 22} }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.04 : ((hasAnyAcDetailLinks || !isEditMode) ? 1.03 : 1.015),
        boxShadow: selected 
            ? `0 0 20px 4px ${electricCyan}, 0 0 7px 2px ${electricCyan} inset`
            : `0 0 18px 4px ${statusUiStyles.glowColor.replace('0.45', '0.65')}`
      }}
      // onClick for details should be handled by the AC strip or info button if present, otherwise on the node itself
      onClick={(!hasAnyAcDetailLinks && !isEditMode && !isNodeEditable) ? handleDetailsClick : undefined}
    >
      {/* DC Input Handle (Top) - Orange for DC */}
      <Handle 
        type="target" position={Position.Top} id="top_dc_in" isConnectable={isConnectable} 
        className="!w-3 !h-3 !bg-orange-500/90 dark:!bg-orange-600/90 !border-orange-600 dark:!border-orange-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="DC Input"
      >
        <ArrowDown01Icon size={8} className="text-white/90 dark:text-black/80 stroke-[3]" />
      </Handle>
      {/* AC Output Handle (Bottom) - Sky Blue for AC */}
      <Handle 
        type="source" position={Position.Bottom} id="bottom_ac_out" isConnectable={isConnectable} 
        className="!w-3 !h-3 !bg-sky-500/90 dark:!bg-sky-600/90 !border-sky-600 dark:!border-sky-500 shadow
                   !rounded-full sld-handle-style hover:!scale-150 hover:!opacity-100 transition-all duration-150 z-10"
        title="AC Output"
      >
        <ArrowUp01Icon size={8} className="text-white/90 dark:text-black/80 stroke-[3]" />
      </Handle>

      {/* Info Button */}
      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details" 
          className="absolute top-1 right-1 h-6 w-6 rounded-full z-30 group/infobtn
                     bg-slate-300/20 dark:bg-slate-700/20 hover:bg-slate-300/40 dark:hover:bg-slate-700/40
                     p-0 backdrop-blur-sm transition-all duration-200" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 
                                group-hover/infobtn:text-[${electricCyan}] dark:group-hover/infobtn:text-[${electricCyan}] 
                                transition-colors duration-150`} /> 
        </Button>
      )}
      
      <div 
        className="flex flex-col items-center w-full h-full px-2 py-1.5 space-y-1 pointer-events-none"
        style={{ justifyContent: hasAnyAcDetailLinks ? 'space-between' : 'center' }} 
      > 
        {/* Top group: Icon, Status, Label */}
        <div className="flex flex-col items-center space-y-0.5">
            <div className="relative h-9 w-9 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={`${StatusIconComponent.displayName || StatusIconComponent.name}-${processedStatus}`} // Key ensures re-render on icon/status change
                        initial={{ opacity:0, y:10, scale:0.7 }} 
                        animate={{ 
                            opacity:1, y:0, scale:1, 
                            rotate: (isDeviceActive && StatusIconComponent === RefreshCwIcon) ? 360 : 0,
                            filter: (isDeviceActive && StatusIconComponent === RefreshCwIcon) 
                                ? `brightness(${0.9 + acPowerRatio * 0.6}) saturate(${1 + acPowerRatio * 0.4})` 
                                : 'none'
                        }} 
                        exit={{ opacity:0, y:-10, scale:0.7, transition:{duration:0.15, ease:"easeIn"} }} 
                        transition={
                            (isDeviceActive && StatusIconComponent === RefreshCwIcon)
                            ? { rotate: { loop: Infinity, ease:"linear", duration: animationRotateDuration }, default: {type:'spring', stiffness:190, damping:16}, filter: { duration: 0.4} }
                            : { type:'spring', stiffness:190, damping:16 }
                        }
                        className="absolute"
                    >
                        <StatusIconComponent 
                            size={28} 
                            className={`${statusUiStyles.iconColorClass} transition-colors duration-300`} 
                            strokeWidth={
                                StatusIconComponent === AlertTriangleIcon ? 2.3 
                                : ((isDeviceActive && StatusIconComponent === RefreshCwIcon) ? 1.8 + (acPowerRatio * 0.6) : 1.8)
                            } 
                        />
                    </motion.div>
                </AnimatePresence>
                {/* Pulse effect for active RefreshCwIcon */}
                {isDeviceActive && StatusIconComponent === RefreshCwIcon && (
                    <motion.div
                        className="absolute inset-[-5px] rounded-full"
                        style={{
                            boxShadow: `0 0 ${6 + acPowerRatio * 12}px ${2 + acPowerRatio * 4}px ${
                                statusUiStyles.iconColorClass.includes('sky') 
                                ? (isDarkMode ? 'hsla(197, 88%, 75%, 0.25)' : 'hsla(197, 80%, 65%, 0.2)')
                                : 'transparent' // Only glow if sky-colored (active)
                            }`
                        }}
                        animate={{
                            scale: [1, 1.03 + acPowerRatio * 0.2, 1],
                            opacity: [0.3 + acPowerRatio * 0.25, 0.6 + acPowerRatio * 0.3, 0.3 + acPowerRatio * 0.25]
                        }}
                        transition={{
                            duration: Math.max(0.8, 2.5 - acPowerRatio * 1.5), // Slower, more gentle pulse
                            repeat: Infinity,
                            ease: "easeInOut" 
                        }}
                    />
                )}
            </div>
            <div className="h-4 overflow-hidden mt-0.5"> {/* Ensure consistent height for status text animation */}
                <AnimatePresence mode="wait">
                    <motion.p 
                        key={`status-${displayStatusText}`} 
                        className={`text-xs font-semibold tracking-tight leading-tight text-center w-full ${statusUiStyles.statusTextColorClass} transition-colors duration-200`} 
                        title={`Status: ${displayStatusText}`} 
                        initial={{ opacity:0, y:6 }} 
                        animate={{ opacity:1, y:0 }} 
                        exit={{ opacity:0, y:-6 }} 
                        transition={{ duration:0.2, ease:"easeInOut" }}
                    >
                        {displayStatusText}
                    </motion.p>
                </AnimatePresence>
            </div>
            <motion.p 
                className={`text-sm font-bold leading-tight text-center w-full text-slate-800 dark:text-slate-100 transition-colors duration-200 mt-0.5`} 
                title={data.label}
            >
                {data.label}
            </motion.p>
        </div>
        
        {/* Middle group: Power and Temp */}
        <div className="flex flex-col items-center space-y-0.5">
            {/* AC Power Output display */}
            <div className="flex items-center justify-center space-x-1 text-xs font-medium" title={`AC Power: ${formattedAcPowerOutputWithContext}`}> 
                <ActivityIcon size={12} className={`${statusUiStyles.powerIconColorClass} transition-colors duration-200`} />
                <AnimatePresence mode="popLayout">
                    <motion.span 
                        key={`acp-${formattedAcPowerOutputWithContext}`} 
                        className={`${statusUiStyles.powerColorClass} font-semibold transition-colors duration-200`} 
                        initial={{ opacity:0, y:-4 }} 
                        animate={{ opacity:1, y:0 }} 
                        exit={{ opacity:0, y:4, transition:{duration:0.1} }} 
                        transition={{ duration:0.2, ease:"easeOut" }}
                    >
                        {formattedAcPowerOutputWithContext.split(" / ")[0]}
                        {formattedAcPowerOutputWithContext.includes(" / ") && (
                            <span className="text-[10px] opacity-70 dark:opacity-60"> / {formattedAcPowerOutputWithContext.split(" / ")[1]}</span>
                        )}
                    </motion.span>
                </AnimatePresence>
                {powerOpcUaNodeId && currentNumericAcPower !== undefined && (
                    <motion.div 
                        className="w-1.5 h-1.5 rounded-full ml-0.5 shadow-sm"
                        style={{ backgroundColor: statusUiStyles.powerIconColorClass }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        title="Live Data"
                    />
                )}
            </div>

            {/* Temperature Display */}
            {formattedTemperature && (
                <div className="flex items-center justify-center space-x-1 text-xs font-medium" title={`Temperature: ${formattedTemperature}`}>
                    <ThermometerIcon size={12} className={`${statusUiStyles.tempIconColorClass} transition-colors duration-200`} />
                    <AnimatePresence mode="popLayout">
                        <motion.span 
                            key={`t-${formattedTemperature}`} 
                            className={`${statusUiStyles.tempColorClass} font-semibold transition-colors duration-200`} 
                            initial={{ opacity:0, y:-4 }} 
                            animate={{ opacity:1, y:0 }} 
                            exit={{ opacity:0, y:4, transition:{duration:0.1} }} 
                            transition={{ duration:0.2, ease:"easeOut" }}
                        >
                            {formattedTemperature}
                        </motion.span>
                    </AnimatePresence>
                    {tempOpcUaNodeId && temperatureValue !== null && (
                        <motion.div 
                            className="w-1.5 h-1.5 rounded-full ml-0.5 shadow-sm"
                            style={{ backgroundColor: statusUiStyles.tempIconColorClass }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            title="Live Data"
                        />
                    )}
                </div>
            )}
        </div>

        {/* Bottom group: AC Details strip */}
        <AnimatePresence>
        {hasAnyAcDetailLinks && (
            <motion.div key="ac-details-button"
                className={`
                    w-full mt-auto mb-0.5 py-1 flex items-center justify-center
                    border-t ${isDarkMode ? 'border-slate-500/40' : 'border-slate-400/50'} 
                    pointer-events-auto group/acdetails
                    ${!isNodeEditable && !isEditMode && 'hover:bg-slate-500/10 dark:hover:bg-slate-400/10 cursor-pointer'} 
                    transition-colors duration-150 rounded-b-[5px]  /* Slight roundness for inner strip bottom */
                `}
                initial={{opacity:0, height: 0, y:5}} 
                animate={{opacity:1, height: 'auto', y:0}} 
                exit={{opacity:0, height: 0, y:5, transition: {duration: 0.15, ease: "easeIn"}}} 
                transition={{type:"spring", stiffness:220, damping:26}}
                onClick={handleDetailsClick} title="View Detailed AC Parameters"
            >
                <div className="flex items-center space-x-1.5 text-xs">
                    <SlidersHorizontalIcon size={13} className={`${statusUiStyles.acDetailsIconColorClass} transition-colors duration-150`} />
                    {/* <span className={`${statusUiStyles.acDetailsIconColorClass} font-medium transition-colors duration-150`}>Details</span> */}
                    <ChevronRightIcon size={14} className={`${statusUiStyles.acDetailsIconColorClass} group-hover/acdetails:translate-x-0.5 transition-transform duration-150`}/>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);