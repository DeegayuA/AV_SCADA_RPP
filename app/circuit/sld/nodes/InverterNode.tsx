// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { InverterNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    formatDisplayValue,
    // getDerivedStyle, // To be replaced
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import {
    InfoIcon,
    ArrowDown01Icon, ArrowUp01Icon, ThermometerIcon, ActivityIcon,
    ChevronRightIcon, SlidersHorizontalIcon
} from 'lucide-react'; // Keep icons used for specific UI elements within the node
import { Button } from "@/components/ui/button";

// const useIsDarkMode = () => { ... }; // To be removed

const InverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex,
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
  const isDeviceActive = useMemo(() => {
    // Inferring active state: if status suggests activity and power isn't negative.
    // This might need a dedicated 'isInverting' data point for precision.
    const activeStatuses = ['running', 'online', 'nominal', 'active', 'inverting', 'producing'];
    return activeStatuses.includes(processedStatus) && (currentNumericAcPower === undefined || currentNumericAcPower >= 0);
  }, [processedStatus, currentNumericAcPower]);

  const standardNodeState = useMemo(() => {
    // Map component's specific logic to the standardized states
    if (processedStatus === 'fault' || processedStatus === 'alarm') return 'FAULT';
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline') return 'OFFLINE';
    if (processedStatus === 'standby' || processedStatus === 'idle') return 'STANDBY';
    if (isDeviceActive) return 'ENERGIZED'; // Or 'NOMINAL' if 'ENERGIZED' is too strong for general active
    return 'UNKNOWN'; // Fallback
  }, [processedStatus, isDeviceActive]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);
  const StatusIconComponent = useMemo(() => appearance.icon, [appearance.icon]);

  const acPowerRatio = useMemo(() => {
    if (ratedPowerKw && ratedPowerKw > 0 && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) {
      return Math.min(1, currentNumericAcPower / ratedPowerKw);
    }
    return isDeviceActive ? 0.5 : 0; // Default if no rating, but active
  }, [currentNumericAcPower, ratedPowerKw, isDeviceActive]);

  const displayStatusText = useMemo(() => {
    if (standardNodeState === 'FAULT') return "FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    if (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') {
      // Could add more detail like "INVERTING" if a specific DP confirms it
      return "ACTIVE";
    }
    return standardNodeState.replace(/_/g, ' '); // Default readable format
  }, [standardNodeState]);

  const temperatureValue = useMemo(() => {
    if (!tempLink || reactiveTempValue === undefined) return null;
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

  const tempStatus = useMemo(() => {
    if (temperatureValue === null) return 'normal';
    const warnTemp = data.config?.warningTemperature ?? 55;
    const maxTemp = data.config?.maxOperatingTemperature ?? 70;
    if (maxTemp && temperatureValue >= maxTemp) return 'critical';
    if (warnTemp && temperatureValue >= warnTemp) return 'warning';
    return 'normal';
  }, [temperatureValue, data.config]);
  
  // Determine color for temperature based on its status, overriding main status if critical/warning
  const currentTempColorVar = useMemo(() => {
    if (tempStatus === 'critical') return 'var(--sld-color-fault)';
    if (tempStatus === 'warning') return 'var(--sld-color-warning)';
    return appearance.statusTextColorVar; // Default to current status text color
  }, [tempStatus, appearance.statusTextColorVar]);


  const animationRotateDuration = useMemo(() => {
    if (!isDeviceActive || StatusIconComponent.displayName !== 'RefreshCwIcon') return 0;
    const baseDuration = 10;
    const minDuration = 1.5;
    const maxDuration = 12;
    if (currentNumericAcPower === undefined || currentNumericAcPower <= 0) return maxDuration;
    return Math.max(minDuration, baseDuration / (1 + acPowerRatio * 3));
  }, [currentNumericAcPower, acPowerRatio, isDeviceActive, StatusIconComponent]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState); // Track standardNodeState
  useEffect(() => {
    if (prevDisplayStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200); 
      prevDisplayStatusRef.current = standardNodeState; return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 0 8px 1.8px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    if (isDeviceActive && !selected && !isRecentStatusChange) {
      // Breathing glow handled by framer-motion
    }
    if (isRecentStatusChange) {
        currentBoxShadow = `0 0 14px 3.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.7)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 16px 3px ${sldAccentVar.replace(')', ', 0.7)').replace('var(','rgba(')}, 0 0 5px 1.5px ${sldAccentVar.replace(')', ', 0.5)').replace('var(','rgba(')} inset`;
    }
    
    return {
      borderColor: appearance.borderColorVar,
      boxShadow: currentBoxShadow, 
      color: appearance.textColorVar, // Default text color for node label
      minWidth: '130px', 
      minHeight: hasAnyAcDetailLinks ? '120px' : '100px',
      ...(nodeWidthFromData && { width: `${nodeWidthFromData}px` }), 
      ...(nodeHeightFromData && { height: `${nodeHeightFromData}px` }),
    };
  }, [appearance, selected, isRecentStatusChange, isDeviceActive, sldAccentVar, nodeWidthFromData, nodeHeightFromData, hasAnyAcDetailLinks]);
  
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
        ${isNodeEditable ? 'cursor-grab' : (hasAnyAcDetailLinks || !isEditMode ? 'cursor-pointer' : 'cursor-default')} 
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10 shadow-xl` : 'shadow-md'}
        overflow-hidden
      `}
      style={{ 
        ...nodeMainStyle, 
        background: `linear-gradient(to bottom, var(--sld-color-node-bg), color-mix(in srgb, var(--sld-color-node-bg) 90%, black))`,
        ringColor: selected ? sldAccentVar : 'transparent',
      }}
      initial={{ opacity: 0, scale: 0.88, y: 18 }} 
      animate={{ 
          opacity: 1, scale: 1, y: 0, height: nodeMainStyle.height,
          boxShadow: isDeviceActive && !selected && !isRecentStatusChange 
            ? [
                `0 0 9px 2px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`,
                `0 0 14px 3px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.5)').replace('var(','rgba(')}`,
                `0 0 9px 2px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`
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
            ? `0 0 20px 4px ${sldAccentVar.replace(')', ', 0.8)').replace('var(','rgba(')}, 0 0 7px 2px ${sldAccentVar.replace(')', ', 0.6)').replace('var(','rgba(')} inset`
            : `0 0 18px 4px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.65)').replace('var(','rgba(')}`
      }}
      // onClick for details should be handled by the AC strip or info button if present, otherwise on the node itself
      onClick={(!hasAnyAcDetailLinks && !isEditMode && !isNodeEditable) ? handleDetailsClick : undefined}
    >
      <Handle 
        type="target" position={Position.Top} id="top_dc_in" isConnectable={isConnectable} 
        className="sld-handle-style"
        style={{ background: 'var(--sld-color-standby)', borderColor: 'var(--sld-color-handle-border)' }} // Example DC color
        title="DC Input"
      >
        <ArrowDown01Icon size={8} className="text-white/90 dark:text-black/80 stroke-[3]" />
      </Handle>
      <Handle 
        type="source" position={Position.Bottom} id="bottom_ac_out" isConnectable={isConnectable} 
        className="sld-handle-style"
        style={{ background: appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)' }} // AC color from status
        title="AC Output"
      >
        <ArrowUp01Icon size={8} className="text-white/90 dark:text-black/80 stroke-[3]" />
      </Handle>

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details" 
          className="absolute top-1 right-1 h-6 w-6 rounded-full z-30 group/infobtn
                     bg-slate-300/20 dark:bg-slate-700/20 hover:bg-slate-300/40 dark:hover:bg-slate-700/40
                     p-0 backdrop-blur-sm transition-all duration-200" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 
                                group-hover/infobtn:text-[var(--sld-color-accent)]
                                transition-colors duration-150`} /> 
        </Button>
      )}
      
      <div 
        className="flex flex-col items-center w-full h-full px-2 py-1.5 space-y-1 pointer-events-none"
        style={{ justifyContent: hasAnyAcDetailLinks ? 'space-between' : 'center' }} 
      > 
        <div className="flex flex-col items-center space-y-0.5">
            <div className="relative h-9 w-9 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={standardNodeState}
                        initial={{ opacity:0, y:10, scale:0.7 }} 
                        animate={{ 
                            opacity:1, y:0, scale:1, 
                            rotate: (isDeviceActive && StatusIconComponent.displayName === 'RefreshCwIcon') ? 360 : 0,
                            filter: (isDeviceActive && StatusIconComponent.displayName === 'RefreshCwIcon')
                                ? `brightness(${0.9 + acPowerRatio * 0.6}) saturate(${1 + acPowerRatio * 0.4})` 
                                : 'none'
                        }} 
                        exit={{ opacity:0, y:-10, scale:0.7, transition:{duration:0.15, ease:"easeIn"} }} 
                        transition={
                            (isDeviceActive && StatusIconComponent.displayName === 'RefreshCwIcon')
                            ? { rotate: { loop: Infinity, ease:"linear", duration: animationRotateDuration }, default: {type:'spring', stiffness:190, damping:16}, filter: { duration: 0.4} }
                            : { type:'spring', stiffness:190, damping:16 }
                        }
                        className="absolute"
                    >
                        <StatusIconComponent 
                            size={28} 
                            style={{ color: appearance.iconColorVar }}
                            className="transition-colors duration-300"
                            strokeWidth={
                                standardNodeState === 'FAULT' || standardNodeState === 'WARNING' ? 2.3
                                : ((isDeviceActive && StatusIconComponent.displayName === 'RefreshCwIcon') ? 1.8 + (acPowerRatio * 0.6) : 1.8)
                            } 
                        />
                    </motion.div>
                </AnimatePresence>
                {isDeviceActive && StatusIconComponent.displayName === 'RefreshCwIcon' && (
                    <motion.div
                        className="absolute inset-[-5px] rounded-full"
                        style={{
                            boxShadow: `0 0 ${6 + acPowerRatio * 12}px ${2 + acPowerRatio * 4}px ${appearance.glowColorVar || appearance.iconColorVar.replace(')',', 0.25)').replace('var(','rgba(')}`
                        }}
                        animate={{
                            scale: [1, 1.03 + acPowerRatio * 0.2, 1],
                            opacity: [0.3 + acPowerRatio * 0.25, 0.6 + acPowerRatio * 0.3, 0.3 + acPowerRatio * 0.25]
                        }}
                        transition={{
                            duration: Math.max(0.8, 2.5 - acPowerRatio * 1.5),
                            repeat: Infinity,
                            ease: "easeInOut" 
                        }}
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
                className={`text-sm font-bold leading-tight text-center w-full transition-colors duration-200 mt-0.5`}
                style={{ color: appearance.textColorVar }}
                title={data.label}
            >
                {data.label}
            </motion.p>
        </div>
        
        <div className="flex flex-col items-center space-y-0.5">
            <div className="flex items-center justify-center space-x-1 text-xs font-medium" title={`AC Power: ${formattedAcPowerOutputWithContext}`}> 
                <ActivityIcon size={12} style={{ color: appearance.statusTextColorVar }} className="transition-colors duration-200" />
                <AnimatePresence mode="popLayout">
                    <motion.span 
                        key={`acp-${formattedAcPowerOutputWithContext}`} 
                        className={`font-semibold transition-colors duration-200`}
                        style={{ color: appearance.statusTextColorVar }}
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
                        style={{ backgroundColor: appearance.statusTextColorVar }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        title="Live Data"
                    />
                )}
            </div>

            {formattedTemperature && (
                <div className="flex items-center justify-center space-x-1 text-xs font-medium" title={`Temperature: ${formattedTemperature}`}>
                    <ThermometerIcon size={12} style={{ color: currentTempColorVar }} className="transition-colors duration-200" />
                    <AnimatePresence mode="popLayout">
                        <motion.span 
                            key={`t-${formattedTemperature}`} 
                            className={`font-semibold transition-colors duration-200`}
                            style={{ color: currentTempColorVar }}
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
                            style={{ backgroundColor: currentTempColorVar }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            title="Live Data"
                        />
                    )}
                </div>
            )}
        </div>

        <AnimatePresence>
        {hasAnyAcDetailLinks && (
            <motion.div key="ac-details-button"
                className={`
                    w-full mt-auto mb-0.5 py-1 flex items-center justify-center
                    border-t pointer-events-auto group/acdetails
                    ${!isNodeEditable && !isEditMode && 'hover:bg-slate-500/10 dark:hover:bg-slate-400/10 cursor-pointer'} 
                    transition-colors duration-150 rounded-b-[5px]
                `}
                style={{ borderColor: 'color-mix(in srgb, var(--sld-color-border) 50%, transparent)' }}
                initial={{opacity:0, height: 0, y:5}} 
                animate={{opacity:1, height: 'auto', y:0}} 
                exit={{opacity:0, height: 0, y:5, transition: {duration: 0.15, ease: "easeIn"}}} 
                transition={{type:"spring", stiffness:220, damping:26}}
                onClick={handleDetailsClick} title="View Detailed AC Parameters"
            >
                <div className="flex items-center space-x-1.5 text-xs">
                    <SlidersHorizontalIcon size={13} style={{ color: appearance.textColorVar }} className="transition-colors duration-150 opacity-70 group-hover/acdetails:opacity-100" />
                    <ChevronRightIcon size={14} style={{ color: appearance.textColorVar }} className="group-hover/acdetails:translate-x-0.5 transition-transform duration-150 opacity-70 group-hover/acdetails:opacity-100"/>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);