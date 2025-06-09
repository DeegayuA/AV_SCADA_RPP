// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelNodeData, CustomNodeType, SLDElementType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { 
    applyValueMapping,
    formatDisplayValue,
    getStandardNodeState,
    getNodeAppearanceFromState,
} from './nodeUtils';

// Define StandardNodeState type locally
type StandardNodeState = 
    'ENERGIZED' | 'PRODUCING_HIGH' | 'PRODUCING_MEDIUM' | 'PRODUCING_LOW' | 
    'IDLE_DAY' | 'IDLE_NIGHT' | 'CONSUMING' | // Added CONSUMING
    'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';

import { InfoIcon, SunIcon, ZapIcon, CloudFogIcon, MoonStarIcon, AlertTriangleIcon, PowerOffIcon, BoltIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// --- NEW DynamicPanelEnergyVisual Component ---
interface DynamicPanelEnergyVisualProps {
  appearance: { // Base appearance from nodeUtils
    iconColorVar: string; 
    borderColorVar: string;
    mainStatusColorVar: string; 
    statusTextColorVar: string;
    textColorVar: string;
    glowColorVar?: string;
  };
  productionRatio: number; // 0 to 1, for production intensity
  consumptionRatio: number; // 0 to 1, for consumption intensity (if panel can consume)
  standardNodeState: StandardNodeState;
}

const DynamicPanelEnergyVisual: React.FC<DynamicPanelEnergyVisualProps> = React.memo(({
  appearance,
  productionRatio,
  consumptionRatio, // NEW
  standardNodeState,
}) => {
  const isProducing = standardNodeState.startsWith('PRODUCING');
  const isConsuming = standardNodeState === 'CONSUMING'; // Specific state for consuming
  const isIdleDay = standardNodeState === 'IDLE_DAY';
  const isIdleNight = standardNodeState === 'IDLE_NIGHT';
  const isOffline = standardNodeState === 'OFFLINE';
  const isFaultOrWarning = standardNodeState === 'FAULT' || standardNodeState === 'WARNING';

  let coreIcon = <SunIcon size={24} strokeWidth={1.75} />;
  let coreColor = 'var(--sld-color-text-muted)'; // Default icon color for unknown state
  let coreOpacity = 0.5;
  let auraColor = 'transparent';
  let auraSpread = 0;
  let particleCount = 0;
  let particleDirection = 1; // 1 for outward (producing), -1 for inward (consuming)
  let particleSpread = 20; // Define the spread radius for particles

  if (isProducing) {
    coreIcon = <SunIcon size={26} strokeWidth={1.5 + productionRatio * 0.75} />;
    coreColor = 'var(--sld-color-producing-panel)';
    auraColor = 'var(--sld-color-producing-panel-glow)';
    coreOpacity = 0.8 + productionRatio * 0.2;
    auraSpread = 5 + productionRatio * 15;
    particleCount = Math.floor(2 + productionRatio * 8);
    particleDirection = 1;
  } else if (isConsuming) {
    coreIcon = <ZapIcon size={24} strokeWidth={1.75} />; // Different icon for consuming
    coreColor = 'var(--sld-color-consuming-panel)';
    auraColor = 'var(--sld-color-consuming-panel-glow)';
    coreOpacity = 0.7 + consumptionRatio * 0.3;
    auraSpread = 3 + consumptionRatio * 10;
    particleCount = Math.floor(1 + consumptionRatio * 6);
    particleDirection = -1; // Particles flow inwards
  } else if (isIdleDay) {
    coreIcon = <CloudFogIcon size={22} strokeWidth={1.5} />; // Cloud for idle day
    coreColor = 'var(--sld-color-idle-panel-day)';
    auraColor = 'var(--sld-color-idle-panel-day-glow)';
    coreOpacity = 0.6;
    auraSpread = 3;
    // particleCount = 1; // Very few, slow ambient particles for idle day
  } else if (isIdleNight) {
    coreIcon = <MoonStarIcon size={22} strokeWidth={1.5} />;
    coreColor = 'var(--sld-color-night-panel)';
    coreOpacity = 0.7;
  } else if (isOffline) {
    coreIcon = <PowerOffIcon size={22} strokeWidth={1.5} />;
    coreColor = 'var(--sld-color-offline-panel-icon)';
    coreOpacity = 0.4;
  } else if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
    coreIcon = <AlertTriangleIcon size={24} strokeWidth={2} />;
    coreColor = standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)';
    coreOpacity = 0.8;
  }
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Aura / Glow */}
      {auraSpread > 0 && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: `${10 + auraSpread * 1.5}px`,
            height: `${10 + auraSpread * 1.5}px`,
            backgroundColor: auraColor,
            filter: `blur(${2 + auraSpread * 0.2}px)`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: (isProducing || isConsuming) ? (0.3 + (isProducing ? productionRatio : consumptionRatio) * 0.4) : 0.15, scale: 1 }}
          transition={{ duration: 0.7, ease: "circOut" }}
        />
      )}
      
      {/* Core Icon */}
      <motion.div
        key={`core-${standardNodeState}`} // Ensure re-animation on state change
        style={{ color: coreColor }}
        initial={{opacity:0.5, scale: 0.9}}
        animate={{ opacity: coreOpacity, scale: [1, 1.02, 1] }}
        transition={{ scale: { duration: 2, repeat: Infinity, ease:"easeInOut" }, opacity:{duration:0.3} }}
      >
        {coreIcon}
      </motion.div>

      {/* Radiating/Imploding Energy Particles */}
      {(isProducing || isConsuming) && particleCount > 0 && (
          Array.from({ length: particleCount }).map((_, i) => {
            const angle = (i / particleCount) * 2 * Math.PI;
            const startRadius = particleDirection === 1 ? 0 : particleSpread; // Start at center if producing, at edge if consuming
            const endRadius = particleDirection === 1 ? particleSpread : 0;
            const duration = 1.2 + Math.random() * 0.8 + (1 - (isProducing ? productionRatio : consumptionRatio)) * 1.0;
            
            return (
                <motion.div
                  key={`p-particle-${i}`}
                  className="absolute rounded-full"
                  style={{ backgroundColor: coreColor }}
                  initial={{ 
                    x: Math.cos(angle) * startRadius, 
                    y: Math.sin(angle) * startRadius,
                    width: 1 + (isProducing ? productionRatio : consumptionRatio) * 1.5, 
                    height: 1 + (isProducing ? productionRatio : consumptionRatio) * 1.5,
                    opacity: 0, 
                  }}
                  animate={{
                    x: Math.cos(angle) * endRadius,
                    y: Math.sin(angle) * endRadius,
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: duration,
                    repeat: Infinity,
                    delay: Math.random() * duration, // Stagger particles
                    ease: particleDirection === 1 ? "easeOut" : "easeIn"
                  }}
                />
            )
          })
      )}
    </div>
  );
});


const PanelNode: React.FC<NodeProps<PanelNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width;
  const nodeHeightFromData = data.height;

  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const animationPowerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'panel.powerGeneration') || powerLink, [data.dataPointLinks, powerLink]);
  const animationPowerDataPointConfig = useMemo(() => animationPowerLink ? dataPoints[animationPowerLink.dataPointId] : undefined, [animationPowerLink, dataPoints]);
  const animationPowerOpcUaNodeId = useMemo(() => animationPowerDataPointConfig?.nodeId, [animationPowerDataPointConfig]);
  const reactiveAnimationPowerValue = useOpcUaNodeValue(animationPowerOpcUaNodeId);
  
  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  // Prioritize 'panel.powerGeneration' for internal logic (e.g. animation intensity)
  // This value is expected to be numeric and represent the core generation metric (like irradiance)
  const currentNumericPowerForLogic = useMemo<number | undefined>(() => {
    const linkToUse = animationPowerLink || powerLink; // Fallback to powerOutput if specific animation link not present
    const dpConfigToUse = animationPowerDataPointConfig || powerDataPointConfig;
    const reactiveValToUse = reactiveAnimationPowerValue !== undefined ? reactiveAnimationPowerValue : reactivePowerValue;

    if (linkToUse && dpConfigToUse && reactiveValToUse !== undefined) {
      const mapped = applyValueMapping(reactiveValToUse, linkToUse);
      if (typeof mapped === 'number') return mapped;
      if (typeof mapped === 'string') {
        const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
        return isNaN(p) ? undefined : p;
      }
      if (typeof mapped === 'boolean') return mapped ? (data.config?.powerRatingWp || 100) : 0;
    }
    return undefined;
  }, [animationPowerLink, animationPowerDataPointConfig, reactiveAnimationPowerValue,
      powerLink, powerDataPointConfig, reactivePowerValue, data.config?.powerRatingWp]);

  // Dedicated numeric power for text display (from 'powerOutput' link)
  const currentNumericPowerForDisplay = useMemo<number | undefined>(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
        const mapped = applyValueMapping(reactivePowerValue, powerLink);
        if (typeof mapped === 'number') return mapped;
        if (typeof mapped === 'string') {
            const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
            return isNaN(p) ? undefined : p;
        }
        if (typeof mapped === 'boolean') return mapped ? (data.config?.powerRatingWp || 100) : 0;
    }
    return currentNumericPowerForLogic; // Fallback display to logic power if specific display power isn't linked
  }, [powerLink, powerDataPointConfig, reactivePowerValue, currentNumericPowerForLogic, data.config?.powerRatingWp]);
  
  const powerRatingWp = useMemo(() => data.config?.powerRatingWp, [data.config?.powerRatingWp]);

  const panelOutputStateDerived = useMemo((): StandardNodeState => {
    const power = currentNumericPowerForLogic;
    if (power === undefined) return 'UNKNOWN'; 
    const isGenerallyOk = ['nominal', 'ok', 'online', 'standby', 'idle', ''].includes(processedStatus);

    if (power > 0.01) { // Producing if power is distinctly positive
        if (!powerRatingWp || powerRatingWp <= 0) return 'PRODUCING_MEDIUM';
        const ratio = power / powerRatingWp;
        if (ratio >= 0.7) return 'PRODUCING_HIGH';
        if (ratio >= 0.15) return 'PRODUCING_MEDIUM';
        return 'PRODUCING_LOW';
    } else if (power < -0.01) { // Consuming if power is distinctly negative
        return 'CONSUMING';
    }
    // If power is near zero, determine Idle Day/Night
    return isGenerallyOk ? 'IDLE_DAY' : 'IDLE_NIGHT'; // Simplified, depends on actual status if available
    
  }, [currentNumericPowerForLogic, powerRatingWp, processedStatus]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
    if (processedStatus === 'fault') return 'FAULT';
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline') return 'OFFLINE';
    return panelOutputStateDerived;
  }, [processedStatus, panelOutputStateDerived]);

  const appearance = useMemo(() => {
      // Custom color mapping based on your new requirements
      let specificAppearance = getNodeAppearanceFromState(standardNodeState, SLDElementType.Panel);
      if (standardNodeState === 'PRODUCING_HIGH' || standardNodeState === 'PRODUCING_MEDIUM' || standardNodeState === 'PRODUCING_LOW') {
        specificAppearance.iconColorVar = 'var(--sld-color-producing-panel)';
        specificAppearance.mainStatusColorVar = 'var(--sld-color-producing-panel)';
        specificAppearance.glowColorVar = 'var(--sld-color-producing-panel-glow)';
      } else if (standardNodeState === 'IDLE_NIGHT') {
        specificAppearance.iconColorVar = 'var(--sld-color-night-panel)';
        specificAppearance.mainStatusColorVar = 'var(--sld-color-night-panel)';
        specificAppearance.glowColorVar = 'rgba(0,0,0,0)'; // No glow for night usually
      } else if (standardNodeState === 'IDLE_DAY') {
        specificAppearance.iconColorVar = 'var(--sld-color-idle-panel-day)';
        specificAppearance.mainStatusColorVar = 'var(--sld-color-idle-panel-day)';
        specificAppearance.glowColorVar = 'var(--sld-color-idle-panel-day-glow)';
      } else if (standardNodeState === 'CONSUMING') {
        specificAppearance.iconColorVar = 'var(--sld-color-consuming-panel)';
        specificAppearance.mainStatusColorVar = 'var(--sld-color-consuming-panel)';
        specificAppearance.glowColorVar = 'var(--sld-color-consuming-panel-glow)';
      } else if (standardNodeState === 'OFFLINE') {
        specificAppearance.iconColorVar = 'var(--sld-color-offline-panel-icon)';
      }
      // Ensure text colors provide contrast against these new backgrounds/icons
      specificAppearance.statusTextColorVar = specificAppearance.statusTextColorVar || 'var(--sld-color-text)'; // Fallback
      return specificAppearance;

  }, [standardNodeState]);

  const isProducing = useMemo(() => standardNodeState.startsWith('PRODUCING'), [standardNodeState]);

  const productionRatio = useMemo<number>(() => {
    const power = currentNumericPowerForLogic;
    if (isProducing && powerRatingWp && powerRatingWp > 0 && power !== undefined && power > 0) {
      return Math.max(0, Math.min(1, power / powerRatingWp));
    }
    return 0;
  }, [standardNodeState, currentNumericPowerForLogic, powerRatingWp, isProducing]);

  const consumptionRatio = useMemo<number>(() => { // If panels can consume
    const power = currentNumericPowerForLogic;
     if (standardNodeState === 'CONSUMING' && powerRatingWp && powerRatingWp > 0 && power !== undefined && power < 0) {
      return Math.max(0, Math.min(1, Math.abs(power) / (powerRatingWp * 0.2))); // Assuming max consumption is 20% of rating
    }
    return 0;
  }, [standardNodeState, currentNumericPowerForLogic, powerRatingWp]);


  const displayStatusText = useMemo<string>(() => {
    switch(standardNodeState){
      case 'FAULT': return "Fault";
      case 'WARNING': return "Warning";
      case 'OFFLINE': return "Offline";
      case 'PRODUCING_HIGH': return "Peak Output";
      case 'PRODUCING_MEDIUM': return "Generating";
      case 'PRODUCING_LOW': return "Low Output";
      case 'IDLE_DAY': return "Idle";
      case 'IDLE_NIGHT': return "Night";
      case 'CONSUMING': return "Consuming"; // New state
      case 'STANDBY': return "Standby";
      default: 
        const readableStatus = standardNodeState.replace(/_/g, ' ');
        return readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1).toLowerCase();
    }
  }, [standardNodeState]);

  const animationGlowDuration = useMemo(() => { 
    if (isProducing) return Math.max(0.8, 2.8 - productionRatio * 2.1);
    if (standardNodeState === 'CONSUMING') return Math.max(0.8, 2.8 - consumptionRatio * 2.1);
    return 3; 
  }, [isProducing, productionRatio, standardNodeState, consumptionRatio]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStandardNodeState = useRef(standardNodeState);
  useEffect(() => {
    if (prevStandardNodeState.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevStandardNodeState.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);
  
  const sldAccentVar = 'var(--sld-color-accent)';

  const calculatedMinHeight = 75; // Make it even more compact
  const calculatedMinWidth = 85;

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 1px 2px rgba(0,0,0,0.03), 0 0.5px 1px rgba(0,0,0,0.02)`; 
    if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
        currentBoxShadow = `0 0 0 1.5px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}, 0 0 7px 0px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}`;
    }
    if (isRecentStatusChange && appearance.glowColorVar && appearance.glowColorVar !== 'transparent') {
        currentBoxShadow = `0 0 12px 2.5px ${appearance.glowColorVar.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 0 2px ${sldAccentVar.replace(')', ', 0.75)').replace('var(','rgba(')}, 0 0 10px 1.5px ${sldAccentVar.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    }
    
    return {
      borderColor: appearance.borderColorVar,
      borderWidth: '1px',
      boxShadow: currentBoxShadow,
      color: appearance.textColorVar,
      minWidth: `${calculatedMinWidth}px`,
      minHeight: `${calculatedMinHeight}px`,
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${calculatedMinWidth}px`,
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${calculatedMinHeight}px`,
      borderRadius: '0.3rem', 
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
      id, type: type || SLDElementType.Panel, position: nodePosition, data,
      selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
      width: nodeWidthFromData || calculatedMinWidth, height: nodeHeightFromData || calculatedMinHeight,
      connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

  const formattedPowerOutputWithContext = useMemo(() => {
    const powerValForDisplay = currentNumericPowerForDisplay;
    const displaySuffix = powerLink?.format?.suffix || (powerValForDisplay && Math.abs(powerValForDisplay) >= 1000 ? 'kW' : 'W');
    const displayPrecision = powerLink?.format?.precision ?? ((powerValForDisplay && Math.abs(powerValForDisplay) < 10 && powerValForDisplay !==0 && displaySuffix === 'W') ? 1 : 0);
    
    let valueToFormat = powerValForDisplay;
    if(displaySuffix === 'kW' && powerValForDisplay !== undefined) {
      valueToFormat = powerValForDisplay / 1000;
    }

    const displayFormatOptions = { 
        type: 'number' as const, 
        precision: displayPrecision, 
        suffix: displaySuffix
    };
    
    let powerStr = (powerValForDisplay !== undefined && valueToFormat !== undefined)
      ? formatDisplayValue(valueToFormat, displayFormatOptions, powerDataPointConfig?.dataType || 'Float')
      : (powerLink ? `--- ${displayFormatOptions.suffix}` : (powerRatingWp ? "Rated" : "N/A"));
      if (powerValForDisplay !== undefined && displaySuffix === 'kW') {
        // For kW values, ensure at least 2 decimal places
        const precision = Math.max(2, displayPrecision);
        const displayFormatOptionsKw = { 
        type: 'number' as const, 
        precision: precision, 
        suffix: displaySuffix
        };
        powerStr = formatDisplayValue(valueToFormat!, displayFormatOptionsKw, powerDataPointConfig?.dataType || 'Float');
      }
    if (powerRatingWp) {
      const ratedSuffix = powerRatingWp >= 1000 ? 'kWp' : 'Wp';
      const ratedValue = ratedSuffix === 'kWp' ? powerRatingWp / 1000 : powerRatingWp;
      const ratedFormat = { type: 'number' as const, precision: 0, suffix: ratedSuffix };
      const ratedStr = formatDisplayValue(ratedValue, ratedFormat, 'Float');
      return powerStr === "Rated" ? ratedStr : `${powerStr} / ${ratedStr}`;
    }
    return powerStr;
  }, [currentNumericPowerForDisplay, powerLink, powerDataPointConfig, powerRatingWp]);
  
  return (
    <motion.div
      className={`panel-node group sld-node relative flex flex-col items-center 
                  border transition-all duration-150 ease-out
                  ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
                  overflow-hidden`}
      style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ 
        opacity: 1, y: 0, scale: 1,
        boxShadow: (isProducing || standardNodeState === 'CONSUMING') && !selected && !isRecentStatusChange && standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING' && appearance.glowColorVar !== 'transparent'
          ? [ 
              nodeMainStyle.boxShadow!,
              `${nodeMainStyle.boxShadow!.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.03)`)}, 0 0 ${1 + productionRatio * 2}px ${0.2 + productionRatio * 0.6}px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.12)').replace('var(','rgba(')}`,
              `${nodeMainStyle.boxShadow!.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.03)`)}, 0 0 ${2 + productionRatio * 4}px ${0.5 + productionRatio * 1.2}px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.22)').replace('var(','rgba(')}`,
              `${nodeMainStyle.boxShadow!.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.03)`)}, 0 0 ${1 + productionRatio * 2}px ${0.2 + productionRatio * 0.6}px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.12)').replace('var(','rgba(')}`,
              nodeMainStyle.boxShadow!,
            ]
          : nodeMainStyle.boxShadow 
      }} 
      exit={{ opacity: 0, y: 5, scale: 0.95, transition: { duration: 0.1, ease: "easeOut"} }}
      transition={
        (isProducing || standardNodeState === 'CONSUMING') && !selected && !isRecentStatusChange && standardNodeState !== 'FAULT' && standardNodeState !== 'WARNING' && appearance.glowColorVar !== 'transparent'
          ? { type: 'spring', stiffness: 190, damping: 28, boxShadow: { duration: animationGlowDuration, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 250, damping: 20 }
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.02 : 1.005, // More subtle hover scale
        borderColor: selected ? appearance.borderColorVar : sldAccentVar,
        boxShadow: selected 
            ? nodeMainStyle.boxShadow
            : `${nodeMainStyle.boxShadow || '0 1px 2px rgba(0,0,0,0.07)'}, 0 0 7px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.25)').replace('var(','rgba(')}`
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle type="source" position={Position.Bottom} id="dc_out" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: (isProducing || standardNodeState === 'CONSUMING') ? appearance.mainStatusColorVar : 'var(--sld-color-deenergized)', borderColor: 'var(--sld-color-handle-border)' }}
        title="DC Output/Input" />

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full z-20 
                     bg-transparent hover:bg-black/[.03] dark:hover:bg-white/[.03] p-0" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 group-hover/infobtn:text-[var(--sld-color-accent)] transition-colors" /> 
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-between w-full h-full px-1 pt-0.5 pb-0.5 pointer-events-none select-none">
        <div className="w-full h-[30px] mt-1 mb-px flex items-center justify-center flex-shrink-0">
            <DynamicPanelEnergyVisual 
                appearance={appearance} 
                productionRatio={productionRatio}
                consumptionRatio={consumptionRatio}
                standardNodeState={standardNodeState}
            />
        </div>
        
        <div className="flex flex-col items-center text-center w-full space-y-0">
            <p className="text-[8px] font-semibold leading-tight truncate w-full" style={{ color: appearance.textColorVar }} title={data.label}>
              {data.label}
            </p>
            <div className="h-[10px] overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={`status-${displayStatusText}`}
                        className="text-[6.5px] font-medium tracking-tighter leading-none truncate w-full"
                        style={{ color: appearance.statusTextColorVar }} title={`Status: ${displayStatusText}`}
                        initial={{ opacity:0, y:2 }} animate={{ opacity:1, y:0 }}
                        exit={{ opacity:0, y:-2 }} transition={{ duration:0.15, ease:"easeOut" }}
                    >
                        {displayStatusText}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
        
        <div className="flex items-center justify-center space-x-0.5 text-[7px] font-semibold w-full truncate mt-auto" title={`Power: ${formattedPowerOutputWithContext}`}>
            <BoltIcon
                size={7} 
                className="transition-colors duration-200 flex-shrink-0"
                style={{ color: (isProducing || standardNodeState === 'CONSUMING') ? appearance.iconColorVar : appearance.statusTextColorVar }}
            />
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={`power-${formattedPowerOutputWithContext}`}
                    className="font-semibold"
                    style={{ color: appearance.statusTextColorVar }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }} transition={{ duration:0.15 }}
                >
                    {formattedPowerOutputWithContext.split(" / ")[0]}
                    {formattedPowerOutputWithContext.includes(" / ") && (
                        <span className="text-[6px] opacity-75 font-normal"> / {formattedPowerOutputWithContext.split(" / ")[1]}</span>
                    )}
                </motion.span>
            </AnimatePresence>
            {powerOpcUaNodeId && currentNumericPowerForDisplay !== undefined && (
                <motion.div 
                    className="w-0.5 h-0.5 rounded-full ml-0.5 flex-shrink-0"
                    style={{ backgroundColor: appearance.statusTextColorVar }}
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);