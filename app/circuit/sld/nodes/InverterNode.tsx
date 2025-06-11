// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { InverterNodeData, CustomNodeType, SLDElementType, InverterType, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    formatDisplayValue,
    getNodeAppearanceFromState,
} from './nodeUtils';

type StandardNodeState = 'ENERGIZED' | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';

import {
    InfoIcon, SettingsIcon, CombineIcon, GridIcon, SunIcon, PowerIcon,
    ActivityIcon, ThermometerIcon, ArrowUpRightIcon, SlidersHorizontalIcon, 
    MinusIcon, PlusIcon, WavesIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DynamicInverterCoreVisualProps {
  appearance: {
    iconColorVar: string;
    mainStatusColorVar: string;
    glowColorVar?: string;
  };
  standardNodeState: StandardNodeState;
  acPowerRatio: number;
  inverterType: InverterType;
}

const DynamicInverterCoreVisual: React.FC<DynamicInverterCoreVisualProps> = React.memo(({
  appearance,
  standardNodeState,
  acPowerRatio,
  // inverterType, // Currently not used to change visual, but kept for future
}) => {
  const isActive = standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL';
  
  let coreColor = appearance.mainStatusColorVar;
  if (standardNodeState === 'FAULT') coreColor = 'var(--sld-color-fault)';
  else if (standardNodeState === 'WARNING') coreColor = 'var(--sld-color-warning)';
  else if (standardNodeState === 'OFFLINE') coreColor = 'var(--sld-color-offline-icon, #a1a1aa)';
  else if (standardNodeState === 'STANDBY' || !isActive) coreColor = 'var(--sld-color-standby-icon, #71717a)';

  const coreOpacity = isActive ? 0.95 + acPowerRatio * 0.05 : (standardNodeState === 'OFFLINE' ? 0.35 : 0.65);
  const numAcParticles = isActive ? Math.max(1, Math.floor(acPowerRatio * 5)) : 0; // Adjusted count
  const numDcParticles = isActive ? Math.max(1, Math.floor(acPowerRatio * 3)) : 0; // Adjusted count
  const particleSizeAc = 1.0 + acPowerRatio * 0.9; // Slightly smaller scaling
  const particleSizeDc = 0.8 + acPowerRatio * 0.7;
  const coreIconStrokeWidth = 1.5 + acPowerRatio * 0.3; // Less aggressive stroke change

  const coreAnimationVariants = {
    idle: { x: 0, scale: 1 },
    inverting: { 
      x: [-0.4, 0.4, -0.4], // Reduced oscillation
      scale: [1, 1.015 + acPowerRatio * 0.02, 1], 
      transition: { 
        x: { duration: 0.7 + (1 - acPowerRatio) * 0.6, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 1.3 + (1 - acPowerRatio) * 1.1, repeat: Infinity, ease: "easeInOut"}
      }
    },
    static: {x:0, scale:1}
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-visible">
        <motion.div
            key={`inverter-core-${standardNodeState}`}
            className="relative z-10"
            variants={coreAnimationVariants}
            animate={isActive ? "inverting" : "static"}
            style={{ opacity: coreOpacity }}
            transition={{ opacity: { duration: 0.35 } }}
        >
            <SlidersHorizontalIcon size={16} color={coreColor} strokeWidth={coreIconStrokeWidth} /> {/* Icon size reduced */}
        </motion.div>

        {isActive && (
            <motion.div 
                className="absolute z-0"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 0.15 + acPowerRatio * 0.25, scale: 0.8 + acPowerRatio * 0.1 }} // Wave more subtle
                transition={{ duration: 0.4, delay: 0.15 }}
            >
                <WavesIcon size={22} color={appearance.iconColorVar} strokeWidth={1} /> {/* Wave icon adjusted */}
            </motion.div>
        )}

        {isActive && numAcParticles > 0 && Array.from({ length: numAcParticles }).map((_, i) => (
            <motion.div
                key={`ac-particle-${i}`}
                className="absolute rounded-full z-[5]"
                style={{ backgroundColor: appearance.iconColorVar, width: particleSizeAc, height: particleSizeAc }}
                initial={{ y: 2, x: (Math.random() - 0.5) * 5, opacity: 0, scale: 0.35 }} // Start closer to center
                animate={{ y: -16, opacity: [0, 0.65 + acPowerRatio * 0.2, 0], scale: [0.35, 0.9 + acPowerRatio * 0.1, 0.35] }} // Reduced travel
                transition={{
                    duration: 1.0 + (1-acPowerRatio) * 0.6 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * (1.0 / numAcParticles), 
                    ease: "linear"
                }}
            />
        ))}

        {isActive && numDcParticles > 0 && Array.from({ length: numDcParticles }).map((_, i) => (
            <motion.div
                key={`dc-particle-${i}`}
                className="absolute rounded-full z-[5]"
                style={{ backgroundColor: 'var(--sld-color-dc-input, #fbbf24)', width: particleSizeDc, height: particleSizeDc }}
                initial={{ y: -2, x: (Math.random() - 0.5) * 4, opacity: 0, scale: 0.3 }}
                animate={{ y: 14, opacity: [0, 0.55, 0], scale: [0.3, 0.7, 0.3] }}
                transition={{
                    duration: 1.2 + (1-acPowerRatio) * 0.8 + Math.random() * 0.4,
                    repeat: Infinity,
                    delay: i * (1.2 / numDcParticles),
                    ease: "linear"
                }}
            />
        ))}
        
        {isActive && appearance.glowColorVar && appearance.glowColorVar !== 'transparent' && (
             <motion.div 
                className="absolute inset-[-2px] rounded-md opacity-40 blur-[3px]" // Tighter glow
                style={{backgroundColor: appearance.glowColorVar}}
                animate={{opacity: [0.03, 0.2 + acPowerRatio*0.15, 0.03]}}
                transition={{duration: 1.6 + (1-acPowerRatio)*1.0, repeat: Infinity, ease:"easeInOut"}}
            />
        )}
    </div>
  );
});
DynamicInverterCoreVisual.displayName = 'DynamicInverterCoreVisual';


const InverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, dragging, zIndex } = props;
  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;

  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ /* ... */ isEditMode:state.isEditMode, currentUser:state.currentUser, setSelectedElementForDetails:state.setSelectedElementForDetails, dataPoints:state.dataPoints}));
  
  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);
  const inverterType = useMemo((): InverterType => data.config?.inverterType || 'on-grid', [data.config?.inverterType]);

    // --- Data Hooks and Processed Values (Keep as is) ---
    const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
    const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
    const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
    const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

    const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput' || link.targetProperty === 'inverter.powerOutput'), [data.dataPointLinks]);
    const powerDataPointConfig = useMemo<DataPoint | undefined>(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
    const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
    const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);
    
    const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
    const tempDpConfig = useMemo<DataPoint | undefined>(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
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
            let valueToProcess: any = reactivePowerValue;
            if(typeof valueToProcess === 'number' && typeof powerDataPointConfig.factor === 'number'){
                valueToProcess *= powerDataPointConfig.factor;
            }
            const mapped = applyValueMapping(valueToProcess, powerLink);
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
        if(isGenerallyActive) {
        if (currentNumericAcPower !== undefined) return currentNumericAcPower >= 0;
        return true; 
        }
        if((processedStatus === 'offgrid' || processedStatus === 'off-grid') && inverterType === 'off-grid' && currentNumericAcPower !== undefined && currentNumericAcPower >=0) return true;
        return false;
    }, [processedStatus, currentNumericAcPower, inverterType]);

    const standardNodeState = useMemo<StandardNodeState>(() => { /* Keep robust logic */
        if (processedStatus.includes('fault') || processedStatus.includes('alarm')) return 'FAULT';
        if (processedStatus.includes('warning')) return 'WARNING';
        if (processedStatus.includes('offline') || processedStatus === 'off') return 'OFFLINE';
        if ((processedStatus.includes('offgrid') || processedStatus.includes('off-grid')) && inverterType !== 'off-grid' && !isDeviceActive ) return 'OFFLINE';
        if (processedStatus.includes('standby') || processedStatus.includes('idle')) {
            if (currentNumericAcPower !== undefined && currentNumericAcPower > 0.01) return 'ENERGIZED'; // Override standby if actually producing
            return 'STANDBY';
        }
        if (isDeviceActive) return 'ENERGIZED'; 
        if ((processedStatus.includes('offgrid') || processedStatus.includes('off-grid')) && inverterType === 'off-grid') return 'ENERGIZED'; // Active if off-grid and status confirms
        if (processedStatus === 'nominal') return 'NOMINAL'; 
        return 'UNKNOWN'; 
    }, [processedStatus, isDeviceActive, inverterType, currentNumericAcPower]);

    const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Inverter), [standardNodeState]);

    const acPowerRatio = useMemo<number>(() => {
        if (ratedPowerKw && ratedPowerKw > 0 && currentNumericAcPower !== undefined && currentNumericAcPower >= 0) {
        return Math.min(1, Math.max(0, currentNumericAcPower / ratedPowerKw));
        }
        return isDeviceActive ? 0.25 : 0; // Adjusted base active ratio
    }, [currentNumericAcPower, ratedPowerKw, isDeviceActive]);

    const displayStatusText = useMemo<string>(() => { /* Keep refined status text */ 
        if (standardNodeState === 'FAULT') return "Fault";
        if (standardNodeState === 'WARNING') return "Warning";
        if (standardNodeState === 'OFFLINE') return "Offline";
        if (standardNodeState === 'STANDBY') return "Standby";
        if (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') {
            if (inverterType === 'off-grid' && (processedStatus.includes('offgrid') || processedStatus.includes('off-grid'))) return "Islanding";
            if (currentNumericAcPower !== undefined && Math.abs(currentNumericAcPower) < 0.01) return "Idle";
            return inverterType === 'off-grid' ? "Supplying" : "Inverting";
        }
        const readableStatus = String(processedStatus || standardNodeState).replace(/_/g, ' ');
        return readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1);
    }, [standardNodeState, processedStatus, inverterType, currentNumericAcPower]);

    const temperatureValue = useMemo<number | null>(() => { /* Keep as is */
        if (!tempLink || !tempDpConfig || reactiveTempValue === undefined) return null;
        let valueToProcess: any = reactiveTempValue;
         if(typeof valueToProcess === 'number' && typeof tempDpConfig.factor === 'number'){
            valueToProcess *= tempDpConfig.factor;
        }
        const mappedValue = applyValueMapping(valueToProcess, tempLink);
        if (typeof mappedValue === 'number') return mappedValue;
        if (typeof mappedValue === 'string') {
            const parsed = parseFloat(mappedValue.replace(/[^\d.-]/g, ''));
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }, [reactiveTempValue, tempLink, tempDpConfig]);

    const formattedTemperature = useMemo<string | null>(() => { /* Keep as is */ 
        if (temperatureValue !== null && tempLink && tempDpConfig) {
        const tempPrecision = tempDpConfig.decimalPlaces ?? tempLink.format?.precision ?? 0;
        const tempFormat = tempLink.format || {type: 'number' as const, precision: tempPrecision, suffix: '°C'};
        if(tempFormat.precision === undefined) tempFormat.precision = tempPrecision;
        return formatDisplayValue(temperatureValue, tempFormat, tempDpConfig.dataType);
        }
        return null;
    }, [temperatureValue, tempLink, tempDpConfig]);
    
    const currentTempColorVar = useMemo<string>(() => { /* Keep as is */ 
        if (!temperatureValue) return appearance.statusTextColorVar; // Default to status text color if no temp
        const warnTemp = data.config?.warningTemperature ?? 55;
        const maxTemp = data.config?.maxOperatingTemperature ?? 70;
        if (maxTemp && temperatureValue >= maxTemp) return 'var(--sld-color-fault-text, var(--sld-color-fault))';
        if (warnTemp && temperatureValue >= warnTemp) return 'var(--sld-color-warning-text, var(--sld-color-warning))';
        return appearance.statusTextColorVar; // Match status text for normal temp
    }, [temperatureValue, data.config, appearance.statusTextColorVar]);
    
  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState);
  useEffect(() => { /* Keep as is */
    if (prevDisplayStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1300);
      prevDisplayStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';
  
  const baseMinNodeWidth = 82; 
  const baseMinNodeHeight = 68; // Adjusted to make more compact


  const nodeMainStyle = useMemo((): React.CSSProperties => { /* Keep robust styling, but ensure width/height applied correctly */
    let currentBoxShadow = `0 0.5px 1px rgba(0,0,0,0.02), 0 0.25px 0.5px rgba(0,0,0,0.01)`; // Even more subtle
    let borderColorActual = selected ? sldAccentVar : appearance.borderColorVar;

    if (standardNodeState === 'FAULT') {
        borderColorActual = 'var(--sld-color-fault)';
        currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 6px 0.5px ${borderColorActual.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    } else if (standardNodeState === 'WARNING') {
        borderColorActual = 'var(--sld-color-warning)';
        currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 6px 0.5px ${borderColorActual.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    }
    
    const glowColor = appearance.glowColorVar || appearance.mainStatusColorVar;
    if (isRecentStatusChange && glowColor && glowColor !== 'transparent' && standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING') {
        currentBoxShadow = `0 0 8px 2px ${glowColor.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    }
     if (selected) { // Selected state overrides recent change for border, but combines shadow
        borderColorActual = sldAccentVar;
        currentBoxShadow = `0 0 0 1.5px ${borderColorActual}, 0 0 8px 1px ${borderColorActual.replace(')', ', 0.4)').replace('var(','rgba(')}, ${currentBoxShadow}`;
    }
    
    return {
      borderColor: borderColorActual,
      borderWidth: '1px', 
      boxShadow: currentBoxShadow, 
      color: appearance.textColorVar,
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${baseMinNodeWidth}px`, 
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${baseMinNodeHeight}px`, 
      borderRadius: '0.3rem',
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState, baseMinNodeWidth, baseMinNodeHeight]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({id, type:type || SLDElementType.Inverter, position:nodePosition, data, selected:selected||false, dragging:dragging||false, zIndex:zIndex||0, width:nodeWidthFromData||baseMinNodeWidth, height:nodeHeightFromData||baseMinNodeHeight, connectable:isConnectable||false}),[id,type,nodePosition,data,selected,dragging,zIndex,nodeWidthFromData,nodeHeightFromData,isConnectable,baseMinNodeWidth,baseMinNodeHeight]);

   const formattedAcPowerOutputWithContext = useMemo<string>(() => { /* Keep as is */
    const powerValForDisplay = currentNumericAcPower; 
    const defaultSuffix = 'kW';
    const linkPrecision = powerLink?.format?.precision;
    const dpPrecision = powerDataPointConfig?.decimalPlaces;
    let displayPrecision: number;
    if (typeof linkPrecision === 'number') displayPrecision = linkPrecision;
    else if (typeof dpPrecision === 'number') displayPrecision = dpPrecision;
    else displayPrecision = (powerValForDisplay !== undefined && Math.abs(powerValForDisplay) < 10 && powerValForDisplay !== 0 && Math.abs(powerValForDisplay) >= 0.01) ? 2 : (powerValForDisplay !== undefined && Math.abs(powerValForDisplay) < 100 ? 1 :0);
    const displayFormatOptions = powerLink?.format || { type: 'number', precision: displayPrecision, suffix: defaultSuffix };
    if(displayFormatOptions.precision === undefined) displayFormatOptions.precision = displayPrecision;
    const powerStr = (powerValForDisplay !== undefined)
      ? formatDisplayValue(powerValForDisplay, displayFormatOptions, powerDataPointConfig?.dataType || 'Float')
      : (powerLink ? `--- ${displayFormatOptions.suffix || defaultSuffix}` : (ratedPowerKw ? "Rated" : "N/A"));
    if (ratedPowerKw) {
      const ratedFormat = { type: 'number' as const, precision: 0, suffix: displayFormatOptions.suffix || defaultSuffix };
      const ratedStr = formatDisplayValue(ratedPowerKw, ratedFormat, 'Float');
      return powerStr === "Rated" ? ratedStr : `${powerStr} / ${ratedStr}`;
    }
    return powerStr;
  }, [currentNumericAcPower, powerLink, powerDataPointConfig, ratedPowerKw]);

  const InverterTypeDisplayIcon = useMemo(() => { /* Keep as is */
    switch (inverterType) {
        case 'hybrid': return CombineIcon;
        case 'off-grid': return PowerIcon; 
        case 'on-grid': default: return GridIcon;
    }
  }, [inverterType]);


  const getHandleBaseStyle = (portType: 'source' | 'target', flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC') => { /* Keep refined logic */
    let baseColorVar = 'var(--sld-color-deenergized)';
    if(standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL'){
        baseColorVar = 
            flowType === 'AC' ? appearance.mainStatusColorVar :
            flowType === 'DC_PV' ? 'var(--sld-color-pv, #f59e0b)' : 
            flowType === 'DC_BATT' ? 'var(--sld-color-battery, #22c55e)' : 
            'var(--sld-color-dc, #facc15)';
    } else if(portType === 'target'){ 
       if(standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING' && standardNodeState !== 'OFFLINE') {
            baseColorVar = 
                flowType === 'AC' ? 'var(--sld-color-grid-idle, #94a3b8)' : // Tailwind slate-400
                flowType === 'DC_PV' ? 'var(--sld-color-pv-idle, #ca8a04)' : // Tailwind yellow-600
                flowType === 'DC_BATT' ? 'var(--sld-color-battery-idle, #16a34a)' : // Tailwind green-600
                'var(--sld-color-dc-idle, #eab308)'; // Tailwind yellow-500
       }
    }
    return { background: baseColorVar, borderColor: 'var(--sld-color-handle-border)' };
  };

  const portDefinitions = useMemo((): { id: string; type: 'source' | 'target'; position: Position; title: string; icon: React.ReactElement; flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC'; }[] => { /* Keep refined port logic */
    const ports: { id: string; type: 'source' | 'target'; position: Position; title: string; icon: React.ReactElement; flowType: 'AC' | 'DC_PV' | 'DC_BATT' | 'DC_GENERIC'; }[] = [];
    const iconSize = 6; 
    const iconStroke = 2.2;

    ports.push({ id: 'ac_out', type: 'source', position: Position.Left, title: 'AC Output (Load/Grid)', icon: <ArrowUpRightIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'AC'});
    ports.push({ id: 'dc_in_solar_1', type: 'target', position: Position.Bottom, title: 'PV/DC Input 1', icon: <SunIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_PV' });
    
    if(data.config?.allowSecondSolarInput) { // Example of conditional port based on config
      ports.push({ id: 'dc_in_solar_2', type: 'target', position: Position.Bottom, title: 'PV/DC Input 2', icon: <SunIcon size={iconSize} strokeWidth={iconStroke} />, flowType: 'DC_PV' });
    }

    if (inverterType === 'hybrid') {
        ports.push({ id: 'batt_in_hybrid', type: 'target', position: Position.Right, title: 'Battery Charge Input', icon: <PlusIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'DC_BATT' });
        ports.push({ id: 'batt_out_hybrid', type: 'source', position: Position.Right, title: 'Battery Discharge Output', icon: <MinusIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'DC_BATT' });
        ports.push({ id: 'ac_grid_in_hybrid', type: 'target', position: Position.Top, title: 'AC Grid Input/Passthrough', icon: <GridIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'AC'});
    } else if (inverterType === 'on-grid') {
        ports.push({ id: 'ac_grid_interface_on_grid', type: 'target', position: Position.Top, title: 'AC Grid (Sync/Export)', icon: <GridIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'AC' });
    } else { // Off-Grid 
        ports.push({ id: 'batt_in_offgrid', type: 'target', position: Position.Right, title: 'Battery Charge (Off-Grid)', icon: <PlusIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'DC_BATT' });
        ports.push({ id: 'batt_out_offgrid', type: 'source', position: Position.Right, title: 'Battery Discharge (Off-Grid)', icon: <MinusIcon size={iconSize} strokeWidth={iconStroke}/>, flowType: 'DC_BATT' });
    }
    
    return ports;
  }, [inverterType, appearance.mainStatusColorVar, standardNodeState, data.config?.allowSecondSolarInput]);


  const getHandleStyle = (position: Position, portIndex: number, totalPortsOnSide: number) => { /* Keep refined handle pos */
    const style: React.CSSProperties = {};
    if (totalPortsOnSide === 0) return {};
    const baseOffset = totalPortsOnSide === 1 ? 50 : 30; // Center if 1, else start at 30%
    const spacing = totalPortsOnSide > 1 ? (100 - 2 * baseOffset) / (totalPortsOnSide - 1) : 0;
    let currentOffset = baseOffset + (portIndex * spacing);
    if (position === Position.Top || position === Position.Bottom) style.left = `${currentOffset}%`;
    else if (position === Position.Left || position === Position.Right) style.top = `${currentOffset}%`;
    return style;
  };
  
  const handleDetailsClick = (e: React.MouseEvent) => { setSelectedElementForDetails(fullNodeObjectForDetails); e.stopPropagation(); };

  return (
    <motion.div
      className={`inverter-node group sld-node relative flex flex-col 
                  transition-colors duration-100 ease-out overflow-visible border`}
      style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
      initial={{ opacity: 0, scale: 0.93, y:3 }} 
      animate={{ /* ... (Main node animation with refined breathing glow, same as previous response) ... */ 
          opacity: 1, scale: 1, y: 0,
          boxShadow: (standardNodeState === 'ENERGIZED' || standardNodeState === 'NOMINAL') && 
                     !selected && !isRecentStatusChange && (appearance.glowColorVar && appearance.glowColorVar !== 'transparent')
            ? [
                nodeMainStyle.boxShadow || `0 0.5px 1px rgba(0,0,0,0.02)`,
                `${nodeMainStyle.boxShadow || `0 0.5px 1px rgba(0,0,0,0.02)`}, 0 0 2px 0.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.18)').replace('var(','rgba(')}`,
                `${nodeMainStyle.boxShadow || `0 0.5px 1px rgba(0,0,0,0.02)`}, 0 0 4px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.28)').replace('var(','rgba(')}`,
                `${nodeMainStyle.boxShadow || `0 0.5px 1px rgba(0,0,0,0.02)`}, 0 0 2px 0.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.18)').replace('var(','rgba(')}`,
                nodeMainStyle.boxShadow || `0 0.5px 1px rgba(0,0,0,0.02)`
              ]
            : nodeMainStyle.boxShadow
      }} 
      exit={{ opacity: 0, scale: 0.92, y:2, transition: { duration: 0.08, ease: "easeOut"} }}
      transition={{ 
        opacity: { duration: 0.15, ease: "easeOut" },
        scale: { type: "spring", stiffness: 250, damping: 22 },
        y: { type: "spring", stiffness: 250, damping: 22 },
        boxShadow: { duration: 1.4 + (1-acPowerRatio)*1.2, repeat: Infinity, ease: "easeInOut" }
      }}
      whileHover={{ /* Fully implemented hover based on previous fixes */
        scale: isNodeEditable ? 1.02 : ((hasAnyAcDetailLinks || !isEditMode) ? 1.015 : 1.008),
        borderColor: selected ? sldAccentVar : (
            standardNodeState.includes('FAULT') ? 'var(--sld-color-fault)' : 
            standardNodeState.includes('WARNING') ? 'var(--sld-color-warning)' : 
            sldAccentVar 
        ),
        boxShadow: selected || isRecentStatusChange || standardNodeState.includes('FAULT') || standardNodeState.includes('WARNING')
            ? nodeMainStyle.boxShadow 
            : `${nodeMainStyle.boxShadow || '0 0.5px 1.5px rgba(0,0,0,0.03)'}, 0 0 6px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar || sldAccentVar).replace(')', ', 0.3)').replace('var(','rgba(')}`
       }}
      onClick={ isNodeEditable ? undefined : ( (hasAnyAcDetailLinks || !isEditMode) ? handleDetailsClick : undefined ) }
    >
      {/* Render Dynamic Handles */}
      {portDefinitions.map((port) => {
        const sidePorts = portDefinitions.filter(p => p.position === port.position);
        const indexOnSide = sidePorts.findIndex(p => p.id === port.id);
        const clonedIcon = React.cloneElement(port.icon as React.ReactElement<any>, { 
            ...(port.icon.props || {}),
            className: `${(port.icon.props as any)?.className || ''} text-white/75 group-hover:text-white dark:text-black/60 dark:group-hover:text-black transition-colors duration-100` // Icon colors adjusted for contrast
        });

        return (
            <Handle key={port.id} type={port.type} position={port.position} id={port.id}
                    className="!w-[9px] !h-[9px] !-m-[4px] sld-handle-style group !z-10" // Smallest handles, z-index for visibility
                    style={{ 
                        ...getHandleBaseStyle(port.type, port.flowType), 
                        ...getHandleStyle(port.position, indexOnSide, sidePorts.length)
                    }}
                    title={port.title}>
                    <div className="flex items-center justify-center w-full h-full">
                        {clonedIcon}
                    </div>
            </Handle>
        );
      })}

    {/* Top Bar for Inverter Type Icon and Info Button */}
    <div className="absolute top-px left-0.5 right-0.5 flex items-center justify-between z-20 h-4 pointer-events-none">
        <div title={`Type: ${inverterType.charAt(0).toUpperCase() + inverterType.slice(1).replace('-',' ')}`} 
             className="p-px px-0.5 bg-background/50 backdrop-blur-sm rounded-sm shadow-xs pointer-events-auto"> {/* Slightly less padding */}
            <InverterTypeDisplayIcon size={7.5} style={{color: appearance.textColorVar}} className="opacity-70" /> {/* Smaller icon */}
        </div>
        {!isEditMode && (
            <Button variant="ghost" size="icon" title="View Details" 
                className="h-3.5 w-3.5 rounded-full group/infobtn pointer-events-auto bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0" // Even smaller button
                onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
            >
                <InfoIcon className={`h-[7px] w-[7px] text-muted-foreground/60 group-hover/infobtn:text-primary transition-colors`} /> {/* Smallest icon */}
            </Button>
        )}
    </div>
      
    {/* Main Content Area - Structure changed to manage space */}
      <div className="flex flex-col items-center justify-between w-full h-full px-0.5 pt-[4px] pb-0.5 pointer-events-none select-none"> {/* Reduced padding */}
        
        {/* Visual Core - Centered with minimal margins */}
        <div className="w-[34px] h-[20px] my-px flex-shrink-0"> {/* Further reduced height and margin */}
             <DynamicInverterCoreVisual 
                appearance={appearance}
                standardNodeState={standardNodeState}
                acPowerRatio={acPowerRatio}
                inverterType={inverterType}
             />
        </div>
        
        {/* Text Info Group - takes remaining space if any, or content drives its height */}
        <div className="flex flex-col items-center text-center w-full max-w-[calc(100%-6px)] mt-px space-y-0"> {/* space-y-0 to control precisely */}
            <p 
                className="text-[8px] font-medium leading-[9px] truncate w-full" // Maintained previous settings
                style={{ color: appearance.textColorVar }} title={data.label}
            >
                {data.label}
            </p>
            <div className="min-h-[8px] w-full"> {/* For status text */}
                <AnimatePresence mode="wait">
                    <motion.p 
                        key={`status-${displayStatusText}`} 
                        className="text-[6.5px] font-normal leading-[7.5px] tracking-tight truncate w-full"
                        style={{ color: appearance.statusTextColorVar }} title={`Status: ${displayStatusText}`} 
                        initial={{ opacity:0, y:1 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-1 }} transition={{ duration:0.1, ease:"circOut" }}
                    >
                        {displayStatusText}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
        
        {/* Metrics Area - Consistently at the bottom, very compact */}
        <div className="flex flex-col items-center space-y-0 w-full text-[6.5px] font-medium flex-shrink-0 mt-auto"> {/* mt-auto pushes to bottom if space available */}
            <div className="flex items-center justify-center space-x-px w-full truncate leading-[9px]" title={`AC Power: ${formattedAcPowerOutputWithContext}`}> 
                <ActivityIcon size={8} style={{ color: appearance.statusTextColorVar }} className="flex-shrink-0 opacity-70" />
                <AnimatePresence mode="popLayout">
                    <motion.span 
                        key={`acp-${formattedAcPowerOutputWithContext}`} 
                        className="text-[10px]"
                        style={{ color: appearance.statusTextColorVar }}
                        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{duration:0.1}}
                    >
                        {formattedAcPowerOutputWithContext.split(" / ")[0]}
                        {formattedAcPowerOutputWithContext.includes(" / ") && (
                            <span className="text-[7px] opacity-70"> / {formattedAcPowerOutputWithContext.split(" / ")[1]}</span>
                        )}
                    </motion.span>
                </AnimatePresence>
                {powerOpcUaNodeId && currentNumericAcPower !== undefined && ( <motion.div className="w-0.5 h-0.5 rounded-full ml-px flex-shrink-0" style={{ backgroundColor: appearance.statusTextColorVar }} animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.3, repeat: Infinity }} /> )}
            </div>

            {formattedTemperature && (
                <div className="flex items-center justify-center space-x-px w-full truncate leading-[9px]" title={`Temperature: ${formattedTemperature}`}>
                    <ThermometerIcon size={5.5} style={{ color: currentTempColorVar }} className="flex-shrink-0 opacity-70"/>
                    <AnimatePresence mode="popLayout">
                        <motion.span 
                            key={`t-${formattedTemperature}`} 
                            style={{ color: currentTempColorVar }}
                            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{duration:0.1}}
                        >
                            {formattedTemperature}
                        </motion.span>
                    </AnimatePresence>
                     {tempOpcUaNodeId && temperatureValue !== null && ( <motion.div className="w-0.5 h-0.5 rounded-full ml-px flex-shrink-0" style={{ backgroundColor: currentTempColorVar }} animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 1.3, repeat: Infinity }} /> )}
                </div>
            )}
        </div>

        {/* Optional AC Details Button - Keep logic, but ensure it doesn't disrupt main flow if absent */}
        {hasAnyAcDetailLinks && !isEditMode && (
            <motion.div key="ac-details-button"
                className={`w-[calc(100%+2px)] -mx-px -mb-px mt-px flex items-center justify-center border-t pointer-events-auto group/acdetails
                            hover:bg-black/[.02] dark:hover:bg-white/[.02] cursor-pointer rounded-b-[0.25rem] flex-shrink-0 h-[10px]`} // Slightly thinner
                style={{ borderColor: 'var(--sld-color-border-ultra-subtle, color-mix(in srgb, var(--sld-color-border) 10%, transparent))' }}
                onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }} 
                title="View Detailed AC Parameters"
            >
                <SettingsIcon size={6} style={{ color: appearance.textColorVar }} className="opacity-40 group-hover/acdetails:opacity-70 transition-opacity duration-150"/>
            </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);