// components/sld/nodes/BatteryNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BatteryNodeData, CustomNodeType, SLDElementType, DataPoint } from '@/types/sld';

interface ExtendedNodeProps extends NodeProps<BatteryNodeData> {
  width?: number;
  height?: number;
}

import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    formatDisplayValue,
    getNodeAppearanceFromState, // We are building custom appearance logic here mostly
} from './nodeUtils';
import { InfoIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";

type BatteryStandardNodeState =
  | 'CHARGING_HIGH' | 'CHARGING_MEDIUM' | 'CHARGING_LOW'
  | 'DISCHARGING_HIGH' | 'DISCHARGING_MEDIUM' | 'DISCHARGING_LOW'
  | 'IDLE_FULL' | 'IDLE_HIGH' | 'IDLE_MEDIUM' | 'IDLE_LOW'
  | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' 
  | 'FAULT_LOW_SOC' | 'WARNING_LOW_SOC' | 'UNKNOWN';

interface DynamicBatteryVisualProps {
  socPercent: number | null;
  batteryAction: 'CHARGING' | 'DISCHARGING' | 'IDLE';
  powerFlowRatio: number; 
  standardNodeState: BatteryStandardNodeState;
  appearance: {
    iconColorVar: string; 
    mainStatusColorVar: string; 
    glowColorVar?: string;
  };
  numBatteryModules?: number;
}

const DynamicBatteryVisual: React.FC<DynamicBatteryVisualProps> = React.memo(({
  socPercent,
  batteryAction,
  powerFlowRatio,
  standardNodeState,
  appearance,
  numBatteryModules = 3,
}) => {
  const soc = socPercent === null ? 0 : Math.max(0, Math.min(100, socPercent));
  const normalizedPower = Math.min(1, Math.max(0.02, powerFlowRatio)); // Keep a minimum if active for visibility

  let fillBackgroundColor = appearance.iconColorVar; // Default based on state (e.g. charging, discharging color)
  // Explicit overrides for critical SOC states
  if (standardNodeState.includes('WARNING_LOW_SOC')) fillBackgroundColor = 'var(--sld-color-warning-dim, #f59e0b)';
  if (standardNodeState.includes('FAULT_LOW_SOC')) fillBackgroundColor = 'var(--sld-color-fault-dim, #ef4444)';
  if (standardNodeState === 'OFFLINE' || (standardNodeState === 'FAULT' && !standardNodeState.includes('LOW_SOC'))) fillBackgroundColor = 'var(--sld-color-offline-fill, #71717a)';

  const particleCount = (batteryAction !== 'IDLE') ? Math.max(1, Math.floor(normalizedPower * 10)) : 0;
  const particleSizeActive = 1.1 + normalizedPower * 2;

  // Subtle fill "breathing" animation
  const fillBreathingVariants = {
    idle: { opacity: 1 }, // Static state
    charging: { 
        opacity: [1, 0.85, 1], 
        transition: { duration: 1.2 + (1 - normalizedPower) * 1.3, repeat: Infinity, ease: "easeInOut" } 
    },
    discharging: { 
        opacity: [1, 0.85, 1], 
        transition: { duration: 1.2 + (1 - normalizedPower) * 1.3, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const BATTERY_VISUAL_TOTAL_HEIGHT = 52; // px, from w-[36px] h-[52px]
  const TERMINAL_HEIGHT = 4; // px, from -top-[3px] and h-[5px] (effective space taken at top)
  const FILLABLE_AREA_HEIGHT = BATTERY_VISUAL_TOTAL_HEIGHT - TERMINAL_HEIGHT; // 48px

  return (
    <div className="relative w-[36px] h-[52px]"> {/* Fixed size for the battery drawing */}
      <div className="absolute inset-0 border-2 rounded-sm bg-background/5 dark:bg-neutral-800/5 shadow-inner"
           style={{ borderColor: 'var(--sld-color-border-subtle, #a1a1aa)' }} // zinc-400
      >
        <div className="absolute inset-0 flex flex-col justify-around items-stretch gap-px p-[3px] pointer-events-none">
            {[...Array(Math.max(1, numBatteryModules -1 ))].map((_, i) => (
            <div key={i} className="w-full h-px bg-current opacity-5" /> // Even more subtle separators
            ))}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-[calc(100%-4px)] overflow-hidden rounded-b-sm"> {/* Fill Area */}
          <motion.div 
            className="absolute bottom-0 left-0 w-full"
            style={{ backgroundColor: fillBackgroundColor }}
            initial={{ height: '0%' }}
            animate={{ height: `${soc}%` }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 110, damping: 19 }}
          >
            {/* Optional: Apply breathing animation to the fill */}
            <motion.div 
              className="w-full h-full"
              variants={fillBreathingVariants}
              animate={batteryAction.toLowerCase()}
            />
          </motion.div>
      </div>

      <div 
        className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[calc(100%-12px)] h-[5px] rounded-t-sm"
        style={{ backgroundColor: 'var(--sld-color-border-subtle, #a1a1aa)' }}
      />

      {/* Energy Flow Particles Container */}
      <div className="absolute inset-0 overflow-visible pointer-events-none"> 
        <AnimatePresence>
          {batteryAction !== 'IDLE' && particleCount > 0 && Array.from({ length: particleCount }).map((_, i) => {
            const isCharging = batteryAction === 'CHARGING';
            const particleBaseY = isCharging ? -6 : FILLABLE_AREA_HEIGHT + 6; // Start outside casing
            const particleTravelDistance = FILLABLE_AREA_HEIGHT * 0.8 * (soc / 100) + (FILLABLE_AREA_HEIGHT * 0.1); // Travel into ~80% of current SOC or a bit if low

            return (
            <motion.div
                key={`batt-particle-${i}-${batteryAction}`} // Removed standardNodeState, action is enough
                className="absolute rounded-full"
                style={{
                    backgroundColor: isCharging ? 'var(--sld-color-charging, #60a5fa)' : appearance.iconColorVar,
                    width: particleSizeActive,
                    height: particleSizeActive,
                    left: `${Math.random() * 50 + 25}%`, // Jitter within middle 50%
                    transform: 'translateX(-50%)',
                }}
                initial={{ 
                    y: particleBaseY, 
                    opacity: 0, 
                    scale: 0.4 + Math.random() * 0.2 
                }}
                animate={{
                    y: isCharging ? particleBaseY + particleTravelDistance : particleBaseY - particleTravelDistance,
                    opacity: [0, 0.75 + normalizedPower * 0.2, 0],
                    scale: [0.4, 1 + normalizedPower * 0.15, 0.4]
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                    duration: 1.1 + (1 - normalizedPower) * 0.9 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * ((1.1 + (1 - normalizedPower) * 0.9) / particleCount),
                    ease: "linear",
                }}
            />
            );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
});
DynamicBatteryVisual.displayName = "DynamicBatteryVisual";


const BatteryNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props;
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

    // --- Data Hooks and Processed Values (assumed correct from previous, keep as is) ---
    const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
    const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
    const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
    const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

    const socLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'soc'), [data.dataPointLinks]);
    const socDataPointConfig = useMemo<DataPoint | undefined>(() => socLink ? dataPoints[socLink.dataPointId] : undefined, [socLink, dataPoints]);
    const socOpcUaNodeId = useMemo(() => socDataPointConfig?.nodeId, [socDataPointConfig]);
    const reactiveSocValue = useOpcUaNodeValue(socOpcUaNodeId);

    const powerFlowLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerFlow'), [data.dataPointLinks]);
    const powerFlowDataPointConfig = useMemo<DataPoint | undefined>(() => powerFlowLink ? dataPoints[powerFlowLink.dataPointId] : undefined, [powerFlowLink, dataPoints]);
    const powerFlowOpcUaNodeId = useMemo(() => powerFlowDataPointConfig?.nodeId, [powerFlowDataPointConfig]);
    const reactivePowerFlowValue = useOpcUaNodeValue(powerFlowOpcUaNodeId);

    const processedStatus = useMemo<string>(() => {
        if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
        const mapped = applyValueMapping(reactiveStatusValue, statusLink);
        return String(mapped).toLowerCase();
        }
        return String(data.status || 'idle').toLowerCase();
    }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

    const socPercent = useMemo<number | null>(() => {
        let rawSoc: string | number | boolean | undefined | null = data.config?.soc; 
        if (socLink && socDataPointConfig && reactiveSocValue !== undefined) {
            let valueToProcess: any = reactiveSocValue;
            if(typeof valueToProcess === 'number' && typeof socDataPointConfig.factor === 'number'){
                valueToProcess *= socDataPointConfig.factor;
            }
            rawSoc = applyValueMapping(valueToProcess, socLink);
        }
        if (rawSoc === null || rawSoc === undefined) return null;
        let numericVal = parseFloat(String(rawSoc));
        return isNaN(numericVal) ? null : Math.max(0, Math.min(100, numericVal)); 
    }, [socLink, socDataPointConfig, reactiveSocValue, data.config?.soc]);

    const processedPowerFlow = useMemo((): number | null => {
        if (powerFlowLink && powerFlowDataPointConfig && reactivePowerFlowValue !== undefined) {
            let valueToProcess: any = reactivePowerFlowValue;
            if(typeof valueToProcess === 'number' && typeof powerFlowDataPointConfig.factor === 'number'){
                 valueToProcess = valueToProcess * powerFlowDataPointConfig.factor;
            }
            const mappedValue = applyValueMapping(valueToProcess, powerFlowLink);
            if (typeof mappedValue === 'number') return mappedValue;
            if (typeof mappedValue === 'string') {
                const numericVal = parseFloat(mappedValue.replace(/[^\d.-]/g, ''));
                return isNaN(numericVal) ? null : numericVal;
            }
        }
        return null;
    }, [powerFlowLink, powerFlowDataPointConfig, reactivePowerFlowValue]);

    const batteryAction = useMemo((): 'CHARGING' | 'DISCHARGING' | 'IDLE' => {
        const statusLower = String(processedStatus).toLowerCase();
        const pwrFlow = processedPowerFlow; // Use local var for checks
        const chargeKeywords = ['charging', 'charge'];
        const dischargeKeywords = ['discharging', 'discharge', 'supplying'];
    
        if (chargeKeywords.some(kw => statusLower.includes(kw))) return 'CHARGING';
        if (dischargeKeywords.some(kw => statusLower.includes(kw))) return 'DISCHARGING';
    
        if (pwrFlow !== null) {
            if (pwrFlow < -1.5) return 'CHARGING'; // Increased threshold slightly for clearer intent
            if (pwrFlow > 1.5) return 'DISCHARGING';
        }
        return 'IDLE';
      }, [processedStatus, processedPowerFlow]);

  const standardNodeState = useMemo((): BatteryStandardNodeState => {
    const statusLower = String(processedStatus).toLowerCase();
    const ratedCapacitykWh = (data.config?.capacityAh && data.config?.voltageNominalV) ? (data.config.capacityAh * data.config.voltageNominalV) / 1000 : null;
    const pwrFlowKW = processedPowerFlow !== null ? processedPowerFlow / 1000 : 0;

    // More robust C-rate thresholds (example values)
    const cRateThresholdMedium = ratedCapacitykWh ? ratedCapacitykWh * 0.20 : 1; // kW for 0.2C
    const cRateThresholdHigh = ratedCapacitykWh ? ratedCapacitykWh * 0.50 : 2.5;  // kW for 0.5C

    if (statusLower.includes('fault') || statusLower.includes('alarm')) {
      return (socPercent !== null && socPercent < 10) ? 'FAULT_LOW_SOC' : 'FAULT';
    }
    if (statusLower.includes('warning')) {
      return (socPercent !== null && socPercent < 20 && socPercent >=10) ? 'WARNING_LOW_SOC' : 'WARNING';
    }
    if (statusLower.includes('offline') || statusLower.includes('disconnected')) return 'OFFLINE';
    if (statusLower.includes('standby')) return 'STANDBY';

    const absPowerKW = Math.abs(pwrFlowKW);

    if (batteryAction === 'CHARGING') {
        if (absPowerKW >= cRateThresholdHigh) return 'CHARGING_HIGH';
        if (absPowerKW >= cRateThresholdMedium) return 'CHARGING_MEDIUM';
        if (absPowerKW > 0.01) return 'CHARGING_LOW'; // Ensure some flow for "LOW"
        return 'IDLE_MEDIUM'; // If charging action but power is zero, treat as idle
    }
    if (batteryAction === 'DISCHARGING') {
        if (absPowerKW >= cRateThresholdHigh) return 'DISCHARGING_HIGH';
        if (absPowerKW >= cRateThresholdMedium) return 'DISCHARGING_MEDIUM';
        if (absPowerKW > 0.01) return 'DISCHARGING_LOW';
        return 'IDLE_MEDIUM';
    }
    if (batteryAction === 'IDLE') {
        if (socPercent === null) return 'IDLE_MEDIUM';
        if (socPercent >= 98) return 'IDLE_FULL';
        if (socPercent >= 70) return 'IDLE_HIGH';
        if (socPercent >= 20) return 'IDLE_MEDIUM';
        if (socPercent < 10 && !(statusLower.includes('warning') || statusLower.includes('fault'))) return 'WARNING_LOW_SOC';
        return 'IDLE_LOW';
    }
    return 'UNKNOWN';
  }, [processedStatus, batteryAction, socPercent, data.config, processedPowerFlow]);

  const appearance = useMemo(() => { /* ... Unchanged, keep the detailed switch case for colors ... */
    let iconColor = 'var(--sld-color-idle-medium-fill, #06b6d4)'; 
      let mainColor = 'var(--sld-color-idle-medium, #22d3ee)';
      let textColor = 'var(--sld-color-text)';
      let statusTextColor = 'var(--sld-color-text-muted)';
      let borderColor = 'var(--sld-color-border)';
      let glowColor: string | undefined = undefined;

      switch(standardNodeState){
        case 'CHARGING_HIGH': case 'CHARGING_MEDIUM': case 'CHARGING_LOW':
            iconColor = 'var(--sld-color-charging-fill, #2563eb)'; 
            mainColor = 'var(--sld-color-charging, #3b82f6)';       
            statusTextColor = mainColor;
            glowColor = 'var(--sld-color-charging-glow, #60a5fa)';
            break;
        case 'DISCHARGING_HIGH': case 'DISCHARGING_MEDIUM': case 'DISCHARGING_LOW':
            iconColor = 'var(--sld-color-discharging-fill, #15803d)'; 
            mainColor = 'var(--sld-color-discharging, #16a34a)';    
            statusTextColor = mainColor;
            glowColor = 'var(--sld-color-discharging-glow, #22c55e)';
            break;
        case 'IDLE_FULL':
            iconColor = 'var(--sld-color-idle-full-fill, #047857)'; 
            mainColor = 'var(--sld-color-idle-full, #059669)';      
            break;
        case 'IDLE_HIGH': case 'IDLE_MEDIUM':
            iconColor = 'var(--sld-color-idle-medium-fill, #0891b2)'; 
            mainColor = 'var(--sld-color-idle-medium, #06b6d4)';     
            break;
        case 'IDLE_LOW':
             iconColor = 'var(--sld-color-warning-dim-fill, #d97706)'; 
             mainColor = 'var(--sld-color-warning-dim, #f59e0b)';     
             statusTextColor = mainColor;
            break;
        case 'WARNING_LOW_SOC':
            iconColor = 'var(--sld-color-warning-fill, #f59e0b)';   
            mainColor = 'var(--sld-color-warning, #fbbf24)';         
            statusTextColor = mainColor;
            borderColor = mainColor;
            textColor = 'var(--sld-color-warning-text, #78350f)';
            glowColor = mainColor;
            break;
        case 'FAULT_LOW_SOC':
            iconColor = 'var(--sld-color-fault-fill, #b91c1c)';     
            mainColor = 'var(--sld-color-fault, #dc2626)';           
            statusTextColor = mainColor;
            borderColor = mainColor;
            textColor = 'var(--sld-color-fault-text, #991b1b)';
            glowColor = mainColor;
            break;
        case 'FAULT':
            iconColor = 'var(--sld-color-fault-fill, #b91c1c)';
            mainColor = 'var(--sld-color-fault, #dc2626)';
            statusTextColor = mainColor;
            borderColor = mainColor;
            textColor = 'var(--sld-color-fault-text, #991b1b)';
            glowColor = mainColor;
            break;
        case 'WARNING':
            iconColor = 'var(--sld-color-warning-fill, #f59e0b)';
            mainColor = 'var(--sld-color-warning, #fbbf24)';
            statusTextColor = mainColor;
            borderColor = mainColor;
            textColor = 'var(--sld-color-warning-text, #78350f)';
            glowColor = mainColor;
            break;
        case 'OFFLINE':
            iconColor = 'var(--sld-color-offline-fill, #6b7280)';    
            mainColor = 'var(--sld-color-offline-icon, #9ca3af)';
            statusTextColor = mainColor;
            borderColor = mainColor;
            textColor = 'var(--sld-color-text-muted)';
            break;
        case 'STANDBY':
            iconColor = 'var(--sld-color-standby-fill, #4b5563)';   
            mainColor = 'var(--sld-color-standby-icon, #6b7280)';
            statusTextColor = mainColor;
            break;
        default: 
            iconColor = 'var(--sld-color-unknown-fill, #4b5563)';
            mainColor = 'var(--sld-color-unknown, #6b7280)';
            statusTextColor = mainColor;
      }
      return { iconColorVar: iconColor, mainStatusColorVar: mainColor, textColorVar: textColor, statusTextColorVar: statusTextColor, borderColorVar: borderColor, glowColorVar: glowColor };
  }, [standardNodeState]);
  
  const displaySocText = socPercent !== null ? `${Math.round(socPercent)}%` : '--';

  const displayStatusText = useMemo<string>(() => { /* ... Unchanged, user-friendly terms are good ... */ 
    switch(standardNodeState) {
        case 'FAULT_LOW_SOC': return "CRITICAL SOC";
        case 'WARNING_LOW_SOC': return "LOW SOC";
        case 'CHARGING_HIGH': return "Fast Charge"; 
        case 'CHARGING_MEDIUM': return "Charging";
        case 'CHARGING_LOW': return "Trickle Charge";
        case 'DISCHARGING_HIGH': return "High Output";
        case 'DISCHARGING_MEDIUM': return "Discharging";
        case 'DISCHARGING_LOW': return "Low Output";
        case 'IDLE_FULL': return "Full";
        case 'IDLE_HIGH': case 'IDLE_MEDIUM': case 'IDLE_LOW': return "Idle";
        case 'FAULT': return "FAULT";
        case 'WARNING': return "WARNING";
        case 'OFFLINE': return "OFFLINE";
        case 'STANDBY': return "STANDBY";
        default: return "Unknown";
    }
},[standardNodeState]);

  const formattedPowerFlow = useMemo<string | null>(() => { /* ... Unchanged ... */ 
    if (processedPowerFlow === null || (batteryAction === "IDLE" && Math.abs(processedPowerFlow) < 10) ) return null;
    const pwrDataPoint = powerFlowDataPointConfig;
    const linkFormat = powerFlowLink?.format;
    let precision: number;
    if(typeof linkFormat?.precision === 'number') precision = linkFormat.precision;
    else if (typeof pwrDataPoint?.decimalPlaces === 'number') precision = pwrDataPoint.decimalPlaces;
    else precision = Math.abs(processedPowerFlow) >= 1000 ? 1 : 0; 
    const useKW = Math.abs(processedPowerFlow) >= 1000;
    const valToFormat = useKW ? processedPowerFlow / 1000 : processedPowerFlow;
    const suffix = linkFormat?.suffix || (useKW ? 'kW' : 'W');
    return formatDisplayValue(valToFormat, {type: 'number', precision, suffix}, pwrDataPoint?.dataType || 'Float');
}, [processedPowerFlow, batteryAction, powerFlowLink, powerFlowDataPointConfig]);

  const powerFlowRatio = useMemo(() => { /* ... Unchanged ... */ 
    if (processedPowerFlow === null) return 0;
    const capacityAh = data.config?.capacityAh;
    const voltageNomV = data.config?.voltageNominalV;
    const ratedCapacityWh = (capacityAh && voltageNomV) ? (capacityAh * voltageNomV) : 5000; 
    return Math.min(1, Math.max(0, Math.abs(processedPowerFlow) / ratedCapacityWh));
}, [processedPowerFlow, data.config]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState);
  useEffect(() => { /* ... Unchanged ... */ 
    if (prevStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1000);
      prevStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
}, [standardNodeState]);

  // Updated for Text Placement Refinements
  const baseNodeWidth = 70; 
  const baseNodeHeight = 100; 

  const nodeMainStyle = useMemo((): React.CSSProperties => { /* ... Keep current robust styling logic, ensure it uses new baseWidth/Height */
    let currentBoxShadow = `0 0.5px 1px rgba(0,0,0,0.03), 0 0.25px 0.5px rgba(0,0,0,0.02)`; 
    const faultColor = standardNodeState.includes('FAULT') ? 'var(--sld-color-fault)' : 
                       standardNodeState.includes('WARNING') || standardNodeState.includes('LOW_SOC') ? 'var(--sld-color-warning)' : 
                       appearance.borderColorVar; 

    if (standardNodeState.includes('FAULT') || standardNodeState.includes('WARNING') || standardNodeState.includes('LOW_SOC')) {
        currentBoxShadow = `0 0 0 1.5px ${faultColor}, 0 0 6px 0.5px ${faultColor.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    }
    const glowColor = appearance.glowColorVar || appearance.mainStatusColorVar;
    if (isRecentStatusChange && glowColor && glowColor !== 'transparent' && (batteryAction === 'CHARGING' || batteryAction === 'DISCHARGING')) {
        currentBoxShadow = `0 0 9px 2px ${glowColor.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 0 1.5px var(--sld-color-accent), 0 0 8px 1px ${'var(--sld-color-accent)'.replace(')', ', 0.35)').replace('var(','rgba(')}`;
    }
    return {
      borderColor: selected ? 'var(--sld-color-accent)' : faultColor,
      borderWidth: '1px', 
      boxShadow: currentBoxShadow, 
      color: appearance.textColorVar,
      width: width || `${baseNodeWidth}px`, // Use explicit or base
      height: height || `${baseNodeHeight}px`, // Use explicit or base
      borderRadius: '0.25rem', 
    };
}, [appearance, selected, isRecentStatusChange, standardNodeState, batteryAction, width, height, baseNodeWidth, baseNodeHeight]);

  const combinedHandleStyle = useMemo(() => {
    const baseBg = standardNodeState === 'OFFLINE' || standardNodeState.includes('FAULT') ? 'var(--sld-color-deenergized)' :
                  batteryAction === 'CHARGING' ? 'var(--sld-color-charging, #3b82f6)' : 
                  batteryAction === 'DISCHARGING' ? 'var(--sld-color-discharging, #16a34a)' : 
                  'var(--sld-color-idle, #06b6d4)';
    return {background: baseBg, borderColor: 'var(--sld-color-handle-border)'};
  }, [standardNodeState, batteryAction]);


  return (
    <motion.div
      className={`sld-node battery-node group relative flex flex-col items-center 
                  transition-colors duration-150 ease-out overflow-visible border`} // Removed justify-start, layout controlled internally
      style={{ ...nodeMainStyle, background: 'var(--sld-color-node-bg)' }}
      initial={{ opacity: 0, scale: 0.93, y:3 }} // Slightly less pronounced entry
      animate={{ /* ... Main animation (same as before) ... */ 
        opacity: 1, scale: selected && isNodeEditable ? 1.015 : 1, y:0,
        boxShadow: (batteryAction === 'CHARGING' || batteryAction === 'DISCHARGING') && 
                    !selected && !isRecentStatusChange && (appearance.glowColorVar && appearance.glowColorVar !== 'transparent')
        ? [ 
            nodeMainStyle.boxShadow,
            `${nodeMainStyle.boxShadow}, 0 0 3px 0.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', `, ${0.2 + powerFlowRatio * 0.15})`).replace('var(','rgba(')}`,
            `${nodeMainStyle.boxShadow}, 0 0 7px 1.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', `, ${0.3 + powerFlowRatio * 0.25})`).replace('var(','rgba(')}`,
            `${nodeMainStyle.boxShadow}, 0 0 3px 0.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', `, ${0.2 + powerFlowRatio * 0.15})`).replace('var(','rgba(')}`,
            nodeMainStyle.boxShadow,
          ]
        : nodeMainStyle.boxShadow
    }}
      exit={{ /* ... (same as before) ... */ 
        opacity: 0, scale: 0.92, y:2, transition: { duration: 0.08, ease: "easeOut" } 
    }}
      transition={{ /* ... (same as before) ... */ 
          boxShadow: { duration: 1.4 + (1-powerFlowRatio)*1.2, repeat: Infinity, ease: "easeInOut" },
          default: {type: 'spring', stiffness: 240, damping: 22}
    }}
      whileHover={{ /* ... (same as before, ensure uses updated nodeMainStyle) ... */ }}
      title={data.label}
    >
        <Handle type="source" position={Position.Top} id="dc_io" 
            className="!w-3.5 !h-2.5 !-mt-[5px] sld-handle-style !z-10" // Adjusted margin, increased z-index
            style={combinedHandleStyle}
            isConnectable={isConnectable} 
            title={batteryAction === 'CHARGING' ? 'DC Input (Charging)' : (batteryAction === 'DISCHARGING' ? 'DC Output (Discharging)' : 'DC I/O')} 
        />
      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full z-20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = { id, type: type || SLDElementType.Battery, position: {x:xPos, y:yPos}, data, selected, dragging, zIndex, width: props.width || undefined, height: props.height || undefined, connectable:isConnectable };
            setSelectedElementForDetails(fullNodeObject);
          }}
        >
          <InfoIcon className="h-2.5 w-2.5 text-muted-foreground/70 group-hover:text-primary" />
        </Button>
      )}

      {/* Main Content Container - Use flex to distribute space */}
      <div className={`flex flex-col items-center justify-between w-full h-full px-1 pt-1.5 pb-1 pointer-events-none select-none
                      ${isRecentStatusChange && (batteryAction !== 'IDLE') ? 'animate-pulse-briefly-battery' : ''}`} 
        style={{ color: appearance.textColorVar }}
      >
        {/* Section 1: Visual */}
        <div className="flex-shrink-0"> {/* Removed mt-1 */}
            <DynamicBatteryVisual 
                socPercent={socPercent}
                batteryAction={batteryAction}
                powerFlowRatio={powerFlowRatio}
                standardNodeState={standardNodeState}
                appearance={appearance}
                numBatteryModules={data.config?.numModules}
            />
        </div>

        {/* Section 2: Text Info - Grouped and centered, allow natural height based on content */}
        <div className="flex flex-col items-center text-center -mt-1 flex-shrink-0"> {/* Negative margin to pull up under visual */}
            <p 
              className="text-[11px] font-bold leading-none" // Maintained larger SOC
              title={`State of Charge: ${displaySocText}`} 
              style={{ color: appearance.mainStatusColorVar }}
            >
              {displaySocText}
            </p>

            {/* Status Text */}
            <div className="min-h-[9px] w-full mt-px"> {/* Use min-h, mt-px for slight separation */}
                 <AnimatePresence mode="wait">
                    <motion.p 
                    key={displayStatusText}
                    className="text-[7px] font-medium leading-[8px] tracking-normal truncate w-full" 
                    title={`Status: ${displayStatusText}`} 
                    style={{ color: appearance.statusTextColorVar }}
                    initial={{opacity:0, y:1}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-1}}
                    transition={{duration: 0.12, ease:"circOut"}}
                    >
                    {displayStatusText}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* Power Flow Text */}
            <div className="min-h-[9px] w-full flex items-center justify-center space-x-0.5 mt-px">
                {formattedPowerFlow && (batteryAction === 'CHARGING' || batteryAction === 'DISCHARGING') && (
                    <>
                        {batteryAction === 'CHARGING' ? 
                            <TrendingDown size={6} className="opacity-70 flex-shrink-0" style={{color: 'var(--sld-color-charging)'}}/> : 
                            <TrendingUp size={6} className="opacity-70 flex-shrink-0" style={{color: 'var(--sld-color-discharging)'}} />
                        }
                        <AnimatePresence mode="popLayout">
                        <motion.p
                            key={`pf-${formattedPowerFlow}`}
                            className="text-[7px] font-semibold leading-[8px] tracking-normal"
                            style={{ color: batteryAction === 'CHARGING' ? 'var(--sld-color-charging)' : 'var(--sld-color-discharging)' }}
                            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                            transition={{duration: 0.15}}
                        >
                            {formattedPowerFlow}
                        </motion.p>
                        </AnimatePresence>
                    </>
                )}
                {/* Show Idle for Power if explicitly Idle */}
                {batteryAction === 'IDLE' && 
                    !standardNodeState.includes('FAULT') && 
                    standardNodeState !== 'OFFLINE' && (
                    <>
                        <Minus size={5} className="text-muted-foreground opacity-50 flex-shrink-0"/>
                        <p className="text-[6.5px] font-normal leading-[7px] text-muted-foreground/70 tracking-normal">Idle</p>
                    </>
                )}
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(BatteryNode);