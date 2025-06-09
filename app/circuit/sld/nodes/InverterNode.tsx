// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { InverterNodeData, CustomNodeType, SLDElementType, InverterType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    formatDisplayValue,
    getStandardNodeState,
    getNodeAppearanceFromState,
} from './nodeUtils';

// Define StandardNodeState type locally
type StandardNodeState = 'ENERGIZED' | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';
import {
    InfoIcon,
    ArrowDown01Icon, ArrowUp01Icon, ThermometerIcon, ActivityIcon,
    SettingsIcon,
    CombineIcon, GridIcon, SunIcon, BatteryChargingIcon, ZapIcon, CpuIcon,
    MinusIcon, PlusIcon, SlidersHorizontalIcon // Using SlidersHorizontal for inverter visual core
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// --- NEW Inlined DynamicInverterCoreVisual Component ---
interface DynamicInverterCoreVisualProps {
  appearance: {
    iconColorVar: string; 
    borderColorVar: string;
    mainStatusColorVar: string; 
    statusTextColorVar: string;
    textColorVar: string;
    glowColorVar?: string;
  };
  isDeviceActive: boolean;
  acPowerRatio: number; 
  standardNodeState: StandardNodeState;
}

const DynamicInverterCoreVisual: React.FC<DynamicInverterCoreVisualProps> = React.memo(({
  appearance,
  isDeviceActive,
  acPowerRatio,
  standardNodeState,
}) => {
  const isActive = standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL';
  
  // Use mainStatusColorVar for active, a muted variant for standby, and fault/warning colors
  let coreColor = appearance.mainStatusColorVar;
  if (standardNodeState === 'FAULT') coreColor = 'var(--sld-color-fault)';
  else if (standardNodeState === 'WARNING') coreColor = 'var(--sld-color-warning)';
  else if (standardNodeState === 'OFFLINE') coreColor = 'var(--sld-color-offline-icon, #9ca3af)';
  else if (standardNodeState === 'STANDBY' || !isActive) coreColor = 'var(--sld-color-standby-icon, #6b7280)';


  const coreOpacity = isActive ? 0.9 + acPowerRatio * 0.1 : (standardNodeState === 'OFFLINE' ? 0.3 : 0.6);
  const numParticles = isActive ? Math.max(2, Math.floor(acPowerRatio * 6)) : 0;
  const particleBaseSize = 1.2;
  const particleSpread = 18 + acPowerRatio * 8; // Visual spread of particles
  const particleTravelDistance = 28; // How far particles travel across

  const iconStrokeWidth = 1.6 + acPowerRatio * 0.4;

  // Unique ID for gradients/filters per instance to avoid conflicts if multiple nodes are rendered
  const instanceId = useMemo(() => Math.random().toString(36).substring(7), []);


  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
        {/* Abstract Core - representing the conversion unit */}
        <motion.div
            key={`core-${standardNodeState}`} // Re-trigger animation on state change
            animate={{ 
                scale: isActive ? [1, 1.02 + acPowerRatio * 0.05, 1] : 1,
                opacity: coreOpacity,
            }}
            transition={{ 
                scale: { duration: isActive ? 1.2 + (1 - acPowerRatio) * 1.3 : 0.3, repeat: isActive ? Infinity : 0, ease: "easeInOut"},
                opacity: { duration: 0.35 }
            }}
        >
            {/* Using SlidersHorizontal as a more abstract "converter" representation */}
            <SlidersHorizontalIcon size={24} color={coreColor} strokeWidth={iconStrokeWidth} className="drop-shadow-sm" />
        </motion.div>

      {/* Flowing Energy Particles: DC side (e.g. from left) to AC side (e.g. to right) */}
      {isActive && acPowerRatio > 0.02 && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: numParticles }).map((_, i) => {
            const duration = 1.0 + Math.random() * 0.8 + (1 - acPowerRatio) * 1.0;
            const delay = Math.random() * duration;
            return (
                <motion.div
                key={`inv-particle-${i}`}
                className="absolute rounded-full"
                style={{ 
                    backgroundColor: appearance.iconColorVar, // AC side color (output)
                    width: particleBaseSize + acPowerRatio * 1.5, 
                    height: particleBaseSize + acPowerRatio * 1.5,
                    // Simulate particles coming from slightly varied Y positions on the "DC" side
                    top: `${40 + (Math.random() - 0.5) * particleSpread}%`,
                }}
                initial={{ 
                    left: '-5%', // Start from just off the "DC" side
                    opacity: 0, 
                    scale: 0.6 + Math.random()*0.3,
                }}
                animate={{
                    left: '105%', // Move across to off the "AC" side
                    opacity: [0, 0.5 + acPowerRatio * 0.3, 0],
                    scale: [0.6 + Math.random()*0.3, 1 + acPowerRatio*0.3, 0.6 + Math.random()*0.3],
                }}
                transition={{
                    duration: duration,
                    repeat: Infinity,
                    delay: delay,
                    ease: "linear" 
                }}
                />
            );
        })}
        </div>
      )}
        {/* Fault/Warning subtle visual indication integrated with icon if possible, or node border more prominent */}
        {(standardNodeState === 'FAULT' || standardNodeState === 'WARNING') && (
             <div className="absolute inset-[-2px] rounded-full opacity-30 animate-pulse" 
                  style={{boxShadow: `0 0 8px 3px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}`}} />
        )}
    </div>
  );
});


const InverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex, 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  // Let React Flow control actual rendered size if data.width/height not set,
  // these are for passing to details panel or if you *want* to enforce a size from data
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;

  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));
  
  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);
  const inverterType = useMemo((): InverterType => data.config?.inverterType || 'on-grid', [data.config?.inverterType]);

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
    const acDetailProps = ['voltageL1', 'voltageL2', 'voltageL3', 'currentL1', 'currentL2', 'currentL3', 'frequencyL1', 'frequencyL2', 'frequencyL3', 'frequency'];
    return data.dataPointLinks?.some(link => acDetailProps.includes(link.targetProperty)) || false;
  }, [data.dataPointLinks]);

  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const currentNumericAcPower = useMemo<number | undefined>(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mapped = applyValueMapping(reactivePowerValue, powerLink);
      if (typeof mapped === 'number') return mapped;
      if (typeof mapped === 'string') {
        const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
        return isNaN(p) ? undefined : p;
      }
       if (typeof mapped === 'boolean') return mapped ? (data.config?.ratedPower || 1) : 0;
    }
    return undefined;
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.ratedPower]);

  const ratedPowerKw = useMemo(() => data.config?.ratedPower, [data.config?.ratedPower]);
  
  const isDeviceActive = useMemo<boolean>(() => {
    const activeStatuses = ['running', 'online', 'nominal', 'active', 'inverting', 'producing', 'ongrid', 'on-grid'];
    const isGenerallyActive = activeStatuses.includes(processedStatus);
    // Consider active if general status is active AND power output is not negative (i.e., consuming)
    // Or if it's an off-grid type specifically stated as active.
    if(isGenerallyActive) {
      if (currentNumericAcPower !== undefined) return currentNumericAcPower >= 0;
      return true; // Active by status, power undefined
    }
    return false;
  }, [processedStatus, currentNumericAcPower]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return 'FAULT';
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline') return 'OFFLINE';
    if ((processedStatus === 'offgrid' || processedStatus === 'off-grid') && inverterType !== 'off-grid' && !isDeviceActive ) return 'OFFLINE';
    if (processedStatus === 'standby' || processedStatus === 'idle') return 'STANDBY';
    if (isDeviceActive) return 'ENERGIZED'; 
    if ((processedStatus === 'offgrid' || processedStatus === 'off-grid') && inverterType === 'off-grid') return 'ENERGIZED';
    if (processedStatus === 'nominal') return 'NOMINAL'; 
    return 'UNKNOWN'; 
  }, [processedStatus, isDeviceActive, inverterType]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Inverter), [standardNodeState]);

  const acPowerRatio = useMemo<number>(() => {
    if (ratedPowerKw && ratedPowerKw > 0 && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) {
      return Math.min(1, Math.max(0, currentNumericAcPower / ratedPowerKw));
    }
    return isDeviceActive ? 0.4 : 0; // Base ratio for active animation if unrated
  }, [currentNumericAcPower, ratedPowerKw, isDeviceActive]);

  const displayStatusText = useMemo<string>(() => {
    if (standardNodeState === 'FAULT') return "Fault";
    if (standardNodeState === 'WARNING') return "Warning";
    if (standardNodeState === 'OFFLINE') return "Offline";
    if (standardNodeState === 'STANDBY') return "Standby";
    if (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') {
        if (inverterType === 'off-grid' && (processedStatus === 'offgrid' || processedStatus === 'off-grid')) return "Off-Grid";
        if (currentNumericAcPower === 0 && (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL')) return "Idle";
        return "Active";
    }
    // Capitalize first letter, keep rest as is after replacing underscore
    const readableStatus = String(processedStatus || standardNodeState).replace(/_/g, ' ');
    return readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1);
  }, [standardNodeState, processedStatus, inverterType, currentNumericAcPower]);

  const temperatureValue = useMemo<number | null>(() => {
    if (!tempLink || reactiveTempValue === undefined) return null;
    const mappedValue = applyValueMapping(reactiveTempValue, tempLink);
    if (typeof mappedValue === 'number') return mappedValue;
    if (typeof mappedValue === 'string') {
        const parsed = parseFloat(mappedValue.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? null : parsed;
    }
    return null;
   }, [reactiveTempValue, tempLink]);

  const formattedTemperature = useMemo<string | null>(() => {
    if (temperatureValue !== null && tempLink && tempDpConfig) {
      const tempFormat = tempLink.format || {type: 'number' as const, precision: 0, suffix: '°C'}; // Default precision 0
      return formatDisplayValue(temperatureValue, tempFormat, tempDpConfig.dataType);
    }
    return null;
  }, [temperatureValue, tempLink, tempDpConfig]);

  const tempStatus = useMemo<'normal' | 'warning' | 'critical'>(() => {
    if (temperatureValue === null) return 'normal';
    const warnTemp = data.config?.warningTemperature ?? 55;
    const maxTemp = data.config?.maxOperatingTemperature ?? 70;
    if (maxTemp && temperatureValue >= maxTemp) return 'critical';
    if (warnTemp && temperatureValue >= warnTemp) return 'warning';
    return 'normal';
   }, [temperatureValue, data.config]);
  
  const currentTempColorVar = useMemo<string>(() => {
    if (tempStatus === 'critical') return 'var(--sld-color-fault-text, var(--sld-color-fault))';
    if (tempStatus === 'warning') return 'var(--sld-color-warning-text, var(--sld-color-warning))';
    return 'var(--sld-color-text-muted)'; // More neutral for normal temp
   }, [tempStatus]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState);
  useEffect(() => {
    if (prevDisplayStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200); 
      prevDisplayStatusRef.current = standardNodeState; return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';
  
  // Let content drive size with reasonable minimums
  const minNodeWidth = 100; // Adjusted for compactness
  const minNodeHeight = 75; // Adjusted for compactness


  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 1px 2px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.02)`; // Even softer base
    if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
        currentBoxShadow = `0 0 0 1.5px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}, 0 0 6px 0px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}`;
    }
    if (isRecentStatusChange && (appearance.glowColorVar || appearance.mainStatusColorVar)) {
        currentBoxShadow = `0 0 10px 2px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.4)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 0 2px ${sldAccentVar.replace(')', ', 0.8)').replace('var(','rgba(')}, 0 0 10px 2px ${sldAccentVar.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    }
    
    return {
      borderColor: appearance.borderColorVar,
      borderWidth: '1px', 
      boxShadow: currentBoxShadow, 
      color: appearance.textColorVar,
      minWidth: `${minNodeWidth}px`,
      minHeight: `${minNodeHeight}px`,
      // Allow explicit width/height from data, otherwise auto for content based sizing
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : 'auto', 
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : 'auto', 
      borderRadius: '0.375rem', // rounded-md
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || 'inverter', position: nodePosition, data, selected: selected || false, 
    dragging: dragging || false, zIndex: zIndex || 0, 
    width: nodeWidthFromData || undefined, // Use undefined if not set, React Flow will calculate
    height: nodeHeightFromData || undefined, 
    connectable: isConnectable || false
   }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

   const formattedAcPowerOutputWithContext = useMemo<string>(() => {
    const powerValForDisplay = currentNumericAcPower; 
    const displayFormatOptions = powerLink?.format || { 
        type: 'number', 
        precision: (powerValForDisplay !== undefined && Math.abs(powerValForDisplay) < 10 && powerValForDisplay !== 0 && Math.abs(powerValForDisplay) >= 0.1) ? 1 : 0, 
        suffix: 'kW' 
    };
    
    const powerStr = (powerValForDisplay !== undefined)
      ? formatDisplayValue(powerValForDisplay, displayFormatOptions, powerDataPointConfig?.dataType || 'Float')
      : (powerLink ? `--- ${displayFormatOptions.suffix || 'kW'}` : (ratedPowerKw ? "Rated" : "N/A"));
      
    if (ratedPowerKw) {
      const ratedFormat = { type: 'number' as const, precision: 0, suffix: displayFormatOptions.suffix || 'kW' };
      const ratedStr = formatDisplayValue(ratedPowerKw, ratedFormat, 'Float');
      return powerStr === "Rated" ? ratedStr : `${powerStr} / ${ratedStr}`;
    }
    return powerStr;
  }, [currentNumericAcPower, powerLink, powerDataPointConfig, ratedPowerKw]);

  const handleDetailsClick = (e: React.MouseEvent) => {
      if (!isNodeEditable && !isEditMode) { 
          e.stopPropagation(); 
          setSelectedElementForDetails(fullNodeObjectForDetails); 
      }
  };

  const InverterTypeIcon = useMemo(() => {
    switch (inverterType) {
        case 'hybrid': return CombineIcon;
        case 'off-grid': return SunIcon; 
        case 'on-grid': default: return GridIcon;
    }
  }, [inverterType]);

  const getAnimatedShadow = () => {
    const baseShadow = nodeMainStyle.boxShadow || `0 1px 2px 0 rgba(0,0,0,0.05)`;
    const glowColor = appearance.glowColorVar || appearance.mainStatusColorVar;
    return [ 
        baseShadow, 
        `${baseShadow}, 0 0 4px 1px ${glowColor.replace(')', ', 0.25)').replace('var(','rgba(')}`,
        `${baseShadow}, 0 0 7px 2px ${glowColor.replace(')', ', 0.4)').replace('var(','rgba(')}`,
        `${baseShadow}, 0 0 4px 1px ${glowColor.replace(')', ', 0.25)').replace('var(','rgba(')}`,
        baseShadow,
    ];
  };

  const handleBaseStyle = "sld-handle-style";
  
  interface PortDefinition {
    id: string;
    type: 'source' | 'target';
    position: Position;
    title: string;
    style: React.CSSProperties;
    icon?: React.ReactElement; // Icon is optional now
  }

  // Reduced set of default ports for a more compact base node.
  // More ports can be enabled via data.config if this becomes a feature.
  const portDefinitions = useMemo((): PortDefinition[] => {
    const ports: PortDefinition[] = [];
    const iconSize = 6.5; // Smaller icons for handles
    const iconStroke = 2.2;
    const iconClass = `text-white/90 dark:text-black/80 stroke-[${iconStroke}]`;

    const dcStyle = { background: 'var(--sld-color-dc)'};
    const pvStyle = { background: 'var(--sld-color-pv)'};
    const batteryStyle = { background: 'var(--sld-color-battery)'};
    const acOutStyle = { background: appearance.mainStatusColorVar };
    const acInStyle = { background: 'var(--sld-color-grid, #718096)'};

    // Always one DC In (Top) and one AC Out (Bottom)
    ports.push({ id: 'dc_in_1', type: 'target', position: Position.Top, title: 'DC Input', style: dcStyle, icon: <ArrowDown01Icon size={iconSize} className={iconClass}/> });
    ports.push({ id: 'ac_out_1', type: 'source', position: Position.Bottom, title: 'AC Output', style: acOutStyle, icon: <ArrowUp01Icon size={iconSize} className={iconClass} /> });
    
    if (inverterType === 'hybrid') {
      ports.push({ id: 'pv_in_hybrid', type: 'target', position: Position.Left, title: 'PV Input (Hybrid)', style: pvStyle, icon: <SunIcon size={iconSize} className={iconClass}/> });
      ports.push({ id: 'batt_io_target_hybrid', type: 'target', position: Position.Right, title: 'Battery DC (Target/Charge)', style: batteryStyle, icon: <PlusIcon size={iconSize} className={iconClass}/> });
      ports.push({ id: 'batt_io_source_hybrid', type: 'source', position: Position.Right, title: 'Battery DC (Source/Discharge)', style: batteryStyle, icon: <MinusIcon size={iconSize} className={`${iconClass} ml-px`}/> }); // Nudge for centering
    } else if (inverterType === 'on-grid') {
       ports.push({ id: 'ac_grid_on_grid', type: 'target', position: Position.Left, title: 'AC Grid Input/Output', style: acInStyle, icon: <GridIcon size={iconSize} className={iconClass}/> });
    }
    // Off-grid has the simplest default ports (DC in, AC out)

    return ports;
  }, [inverterType, appearance.mainStatusColorVar, data.config]);

  const getHandlePosition = (position: Position, index: number, totalOnSide: number) => {
    if (totalOnSide === 0) return {};
    // Special handling for right side battery IO to stack them
    if (position === Position.Right && portDefinitions[index]?.id.startsWith('batt_io_')) {
        const battPortsOnRight = portDefinitions.filter(p => p.position === Position.Right && p.id.startsWith('batt_io_'));
        const battIndex = battPortsOnRight.findIndex(p => p.id === portDefinitions[index].id);
        if (battPortsOnRight.length === 2) {
             return { top: `${35 + battIndex * 30}%` }; // Stack them closer: 35% and 65%
        }
    }
    return position === Position.Top || position === Position.Bottom 
           ? { left: `${(100 / (totalOnSide + 1)) * (index + 1)}%` } 
           : { top: `${(100 / (totalOnSide + 1)) * (index + 1)}%` };
  };


  return (
    <motion.div
      className={`inverter-node group sld-node relative flex flex-col 
                  transition-all duration-150 ease-out overflow-visible
                  border ${isNodeEditable ? 'cursor-grab' : (hasAnyAcDetailLinks || !isEditMode ? 'cursor-pointer' : 'cursor-default')} 
                 `}
      style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
      initial={{ opacity: 0, scale: 0.95, y: 5 }} 
      animate={{ 
          opacity: 1, scale: 1, y: 0,
          boxShadow: (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') && !selected && !isRecentStatusChange && appearance.glowColorVar
            ? getAnimatedShadow()
            : nodeMainStyle.boxShadow
      }} 
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.1, ease: "easeOut"} }}
      transition={
        (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') && !selected && !isRecentStatusChange && appearance.glowColorVar
          ? { type: 'spring', stiffness: 170, damping: 26, boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } } 
          : { type: 'spring', stiffness: 230, damping: 20 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.015 : ((hasAnyAcDetailLinks || !isEditMode) ? 1.01 : 1.005),
        borderColor: selected ? appearance.borderColorVar : sldAccentVar, // Enhanced hover border
        boxShadow: selected 
            ? nodeMainStyle.boxShadow 
            : `${nodeMainStyle.boxShadow || '0 1px 2px 0 rgba(0,0,0,0.05)'}, 0 0 8px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.3)').replace('var(','rgba(')}`
      }}
      onClick={(!hasAnyAcDetailLinks && !isEditMode && !isNodeEditable) ? handleDetailsClick : undefined}
    >
      {/* Render Dynamic Handles */}
      {portDefinitions.map((port) => {
        const sidePorts = portDefinitions.filter(p => p.position === port.position);
        const indexOnSide = sidePorts.findIndex(p => p.id === port.id);
        const clonedIcon = port.icon ? React.cloneElement(port.icon, { 
            className: `${(port.icon.props as any)?.className || ''} text-white/80 dark:text-black/70` 
        } as any) : null;

        return (
            <Handle key={port.id} type={port.type} position={port.position} id={port.id}
                    className={handleBaseStyle}
                    style={{ ...port.style, ...getHandlePosition(port.position, indexOnSide, sidePorts.length) , borderColor: 'var(--sld-color-handle-border)'}}
                    title={port.title}>
                        {clonedIcon}
            </Handle>
        );
      })}

      <div className="absolute top-px left-0.5 right-0.5 flex items-center justify-between z-10 h-4">
        <div title={`Type: ${inverterType.charAt(0).toUpperCase() + inverterType.slice(1).replace('-',' ')}`} className="p-px px-0.5 bg-[var(--sld-color-node-bg)] rounded-sm shadow-xs opacity-90">
            <InverterTypeIcon size={8} style={{color: appearance.textColorVar}} className="opacity-70" />
        </div>
        {!isEditMode && (
            <Button variant="ghost" size="icon" title="View Details" 
            className="h-4 w-4 rounded-full group/infobtn bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0" 
            onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
            >
            <InfoIcon className={`h-2 w-2 text-gray-500 dark:text-gray-400 group-hover/infobtn:text-[var(--sld-color-accent)] transition-colors`} /> 
            </Button>
        )}
      </div>
      
      <div className="flex flex-col items-center justify-between w-full h-full px-1 pt-[14px] pb-0.5 pointer-events-none">
        <div className="w-[42px] h-[26px] mt-px mb-0.5 flex-shrink-0">
             <DynamicInverterCoreVisual 
                appearance={appearance}
                isDeviceActive={isDeviceActive}
                acPowerRatio={acPowerRatio}
                standardNodeState={standardNodeState}
             />
        </div>
        
        <div className="flex flex-col items-center text-center space-y-0 w-full">
            <motion.p 
                className={`text-[8.5px] font-medium leading-snug truncate w-full`}
                style={{ color: appearance.textColorVar }} title={data.label}
            >
                {data.label}
            </motion.p>
            <div className="h-[10px] overflow-hidden"> {/* Slightly reduced height for status */}
                <AnimatePresence mode="wait">
                    <motion.p 
                        key={`status-${displayStatusText}`} 
                        className={`text-[6.5px] font-normal tracking-tight leading-tight truncate w-full`} 
                        style={{ color: appearance.statusTextColorVar }} title={`Status: ${displayStatusText}`} 
                        initial={{ opacity:0, y:2 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-2 }} transition={{ duration:0.15, ease:"easeOut" }}
                    >
                        {displayStatusText}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
        
        <div className="flex flex-col items-center space-y-0 w-full text-[7px] mt-auto"> {/* Smallest text for metrics */}
            <div className="flex items-center justify-center space-x-px w-full truncate" title={`AC Power: ${formattedAcPowerOutputWithContext}`}> 
                <ActivityIcon size={7} style={{ color: appearance.statusTextColorVar }} className="flex-shrink-0" />
                <AnimatePresence mode="popLayout">
                    <motion.span 
                        key={`acp-${formattedAcPowerOutputWithContext}`} 
                        className={`font-medium`}
                        style={{ color: appearance.statusTextColorVar }}
                        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{duration:0.15}}
                    >
                        {formattedAcPowerOutputWithContext.split(" / ")[0]}
                        {formattedAcPowerOutputWithContext.includes(" / ") && (
                            <span className="text-[6px] opacity-70 font-normal"> / {formattedAcPowerOutputWithContext.split(" / ")[1]}</span>
                        )}
                    </motion.span>
                </AnimatePresence>
                {powerOpcUaNodeId && currentNumericAcPower !== undefined && ( <motion.div className="w-0.5 h-0.5 rounded-full ml-px flex-shrink-0" style={{ backgroundColor: appearance.statusTextColorVar }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} /> )}
            </div>

            {formattedTemperature && (
                <div className="flex items-center justify-center space-x-px w-full truncate" title={`Temperature: ${formattedTemperature}`}>
                    <ThermometerIcon size={7} style={{ color: currentTempColorVar }} className="flex-shrink-0"/>
                    <AnimatePresence mode="popLayout">
                        <motion.span 
                            key={`t-${formattedTemperature}`} 
                            className={`font-medium`}
                            style={{ color: currentTempColorVar }}
                            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{duration:0.15}}
                        >
                            {formattedTemperature}
                        </motion.span>
                    </AnimatePresence>
                     {tempOpcUaNodeId && temperatureValue !== null && ( <motion.div className="w-0.5 h-0.5 rounded-full ml-px flex-shrink-0" style={{ backgroundColor: currentTempColorVar }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} /> )}
                </div>
            )}
        </div>

        <AnimatePresence>
        {hasAnyAcDetailLinks && !isEditMode && (
            <motion.div key="ac-details-button"
                className={`w-full mt-auto pt-px flex items-center justify-center border-t pointer-events-auto group/acdetails
                            hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer rounded-b-md`}
                style={{ borderColor: 'color-mix(in srgb, var(--sld-color-border) 10%, transparent)' }}
                initial={{opacity:0, height:0}} animate={{opacity:1, height: '12px'}} exit={{opacity:0, height:0, transition: {duration: 0.1}}} 
                transition={{type:"spring", stiffness:140, damping:16, delay: 0.1}}
                onClick={handleDetailsClick} title="View Detailed AC Parameters"
            >
                <SettingsIcon size={8} style={{ color: appearance.textColorVar }} className="opacity-40 group-hover/acdetails:opacity-70 transition-opacity duration-150"/>
            </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);