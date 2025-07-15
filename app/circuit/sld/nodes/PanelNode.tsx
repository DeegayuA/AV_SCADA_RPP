// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelNodeData, CustomNodeType, SLDElementType, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
  applyValueMapping,
  formatDisplayValue,
  getNodeAppearanceFromState,
} from './nodeUtils';

// Define StandardNodeState type locally
type StandardNodeState =
  'ENERGIZED' | 'PRODUCING_HIGH' | 'PRODUCING_MEDIUM' | 'PRODUCING_LOW' |
  'IDLE_DAY' | 'IDLE_NIGHT' | 'CONSUMING' |
  'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL';

import { InfoIcon, SunIcon, ZapIcon, CloudFogIcon, MoonStarIcon, AlertTriangleIcon, PowerOffIcon, BoltIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// --- DynamicPanelEnergyVisual Component (Code ommited for brevity - unchanged from previous version) ---
interface DynamicPanelEnergyVisualProps {
  appearance: {
    iconColorVar: string;
    borderColorVar: string;
    mainStatusColorVar: string;
    statusTextColorVar: string;
    textColorVar: string;
    glowColorVar?: string;
  };
  productionRatio: number;
  consumptionRatio: number;
  standardNodeState: StandardNodeState;
}

const DynamicPanelEnergyVisual: React.FC<DynamicPanelEnergyVisualProps> = React.memo(({
  appearance,
  productionRatio,
  consumptionRatio,
  standardNodeState,
}) => {
  const isProducing = standardNodeState.startsWith('PRODUCING');
  const isConsuming = standardNodeState === 'CONSUMING';
  const isIdleDay = standardNodeState === 'IDLE_DAY';
  const isIdleNight = standardNodeState === 'IDLE_NIGHT';
  const isOffline = standardNodeState === 'OFFLINE';
  const isFaultOrWarning = standardNodeState === 'FAULT' || standardNodeState === 'WARNING';

  let coreIcon = <SunIcon size={18} strokeWidth={1.75} />;
  let coreColor = 'var(--sld-color-text-muted)';
  let coreOpacity = 0.5;
  let auraColor = 'transparent';
  let auraSpread = 0;
  let particleCount = 10;
  let particleDirection = 1;
  let currentParticleSpread = 12;

  const activeRatio = isProducing ? productionRatio : (isConsuming ? consumptionRatio : 0);

  if (isProducing) {
    coreIcon = <SunIcon size={20} strokeWidth={1.5 + productionRatio * 1.0} />;
    coreColor = 'var(--sld-color-producing-panel)';
    auraColor = 'var(--sld-color-producing-panel-glow)';
    coreOpacity = 0.85 + productionRatio * 0.15;
    auraSpread = 6 + productionRatio * 15;
    particleCount = Math.floor(4 + productionRatio * 10);
    currentParticleSpread = 14 + productionRatio * 18;
    particleDirection = 1;
  } else if (isConsuming) {
    coreIcon = <ZapIcon size={18} strokeWidth={1.75 + consumptionRatio * 0.5} />;
    coreColor = 'var(--sld-color-consuming-panel)';
    auraColor = 'var(--sld-color-consuming-panel-glow)';
    coreOpacity = 0.75 + consumptionRatio * 0.25;
    auraSpread = 4 + consumptionRatio * 10;
    particleCount = Math.floor(3 + consumptionRatio * 7);
    currentParticleSpread = 10 + consumptionRatio * 13;
    particleDirection = -1;
  } else if (isIdleDay) {
    coreIcon = <CloudFogIcon size={18} strokeWidth={1.5} />;
    coreColor = 'var(--sld-color-idle-panel-day)';
    auraColor = 'var(--sld-color-idle-panel-day-glow)';
    coreOpacity = 0.6;
    auraSpread = 4;
    particleCount = 2;
    currentParticleSpread = 8;
  } else if (isIdleNight) {
    coreIcon = <MoonStarIcon size={18} strokeWidth={1.5} />;
    coreColor = 'var(--sld-color-night-panel)';
    coreOpacity = 0.7;
    auraSpread = 0;
  } else if (isOffline) {
    coreIcon = <PowerOffIcon size={18} strokeWidth={1.5} />;
    coreColor = 'var(--sld-color-offline-panel-icon)';
    coreOpacity = 0.4;
  } else if (isFaultOrWarning) {
    coreIcon = <AlertTriangleIcon size={18} strokeWidth={2} />;
    coreColor = standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)';
    auraColor = coreColor;
    coreOpacity = 0.9;
    auraSpread = 5;
  }

  const auraOpacityMin = 0.15 + activeRatio * 0.2;
  const auraOpacityMax = 0.35 + activeRatio * 0.4;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {auraSpread > 0 && (
        <motion.div
          className="absolute rounded-full z-0"
          style={{
            width: `${8 + auraSpread * 1.5}px`,
            height: `${8 + auraSpread * 1.5}px`,
            backgroundColor: auraColor,
            filter: `blur(${3 + auraSpread * 0.3}px)`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: (isProducing || isConsuming) ? [auraOpacityMin, auraOpacityMax, auraOpacityMin] : (isIdleDay || isFaultOrWarning ? 0.15 : 0.05),
            scale: 1
          }}
          transition={{
            duration: 0.7,
            ease: "circOut",
            opacity: (isProducing || isConsuming) ? { duration: 1.8 + (1 - activeRatio) * 1.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.7 }
          }}
        />
      )}

      <motion.div
        key={`core-${standardNodeState}`}
        className="relative z-10"
        style={{ color: coreColor }}
        initial={{ opacity: 0.5, scale: 0.9, filter: 'brightness(100%)' }}
        animate={{
          opacity: coreOpacity,
          scale: isProducing ? [1, 1.03 + productionRatio * 0.07, 1] : (isConsuming ? [1, 1.02 + consumptionRatio * 0.05, 1] : [1, 1.01, 1]),
          filter: (isProducing || isConsuming) ? `brightness(${100 + activeRatio * 30}%)` : (isFaultOrWarning ? 'brightness(115%)' : 'brightness(100%)')
        }}
        transition={{
          scale: { duration: 1.7 + (1 - activeRatio) * 2.0, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 0.35, ease: "easeOut" },
          filter: { duration: 0.45, ease: "circOut" }
        }}
      >
        {coreIcon}
      </motion.div>

      {particleCount > 0 && (isProducing || isConsuming || isIdleDay) && (
        Array.from({ length: particleCount }).map((_, i) => {
          const angle = (i / particleCount) * 2 * Math.PI + (Math.random() - 0.5) * 0.25;
          const startRadius = particleDirection === 1 ? (isIdleDay ? 1 : 0) : currentParticleSpread;
          const endRadius = particleDirection === 1 ? currentParticleSpread : (isIdleDay ? 1 : 0);
          const durationBase = isIdleDay ? 4.0 : 1.2;
          const durationRandomness = isIdleDay ? 1.8 : 0.8;
          const ratioFactor = isIdleDay ? 0 : (1 - activeRatio);
          const duration = durationBase + Math.random() * durationRandomness + ratioFactor * 1.0;
          const particleColor = isIdleDay ? auraColor : coreColor;
          const particleBaseSize = isIdleDay ? 1.2 : 1.5;
          const particleSizeMultiplier = isIdleDay ? 0.7 : 2.5;

          return (
            <motion.div
              key={`p-particle-${i}-${standardNodeState}`}
              className="absolute rounded-full z-0"
              style={{ backgroundColor: particleColor }}
              initial={{
                x: Math.cos(angle) * startRadius,
                y: Math.sin(angle) * startRadius,
                width: particleBaseSize + activeRatio * particleSizeMultiplier * (particleDirection === 1 ? 0.4 : 1),
                height: particleBaseSize + activeRatio * particleSizeMultiplier * (particleDirection === 1 ? 0.4 : 1),
                scale: 0.3,
                opacity: 0,
              }}
              animate={{
                x: Math.cos(angle) * endRadius,
                y: Math.sin(angle) * endRadius,
                opacity: isIdleDay ? [0, 0.4, 0] : [0, 0.8, 0],
                scale: particleDirection === 1 ? [0.4, 1.25, isIdleDay ? 0.5 : 0.35] : [1.25, 0.4],
                width: particleBaseSize + activeRatio * particleSizeMultiplier,
                height: particleBaseSize + activeRatio * particleSizeMultiplier,
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: Math.random() * duration,
                ease: particleDirection === 1 ? "circOut" : "circIn"
              }}
            />
          )
        })
      )}
    </div>
  );
});
DynamicPanelEnergyVisual.displayName = 'DynamicPanelEnergyVisual';


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
  const powerDataPointConfig = useMemo<DataPoint | undefined>(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const animationPowerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'panel.powerGeneration') || powerLink, [data.dataPointLinks, powerLink]);
  const animationPowerDataPointConfig = useMemo<DataPoint | undefined>(() => animationPowerLink ? dataPoints[animationPowerLink.dataPointId] : undefined, [animationPowerLink, dataPoints]);
  const animationPowerOpcUaNodeId = useMemo(() => animationPowerDataPointConfig?.nodeId, [animationPowerDataPointConfig]);
  const reactiveAnimationPowerValue = useOpcUaNodeValue(animationPowerOpcUaNodeId);

  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase();
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const currentNumericPowerForLogic = useMemo<number | undefined>(() => {
    const linkToUse = animationPowerLink || powerLink;
    const dpConfigToUse = animationPowerDataPointConfig || powerDataPointConfig;
    const reactiveValToUse = reactiveAnimationPowerValue !== undefined ? reactiveAnimationPowerValue : reactivePowerValue;

    if (linkToUse && dpConfigToUse && reactiveValToUse !== undefined) {
      let valueToProcess: any = reactiveValToUse;
      if (typeof valueToProcess === 'number' && typeof dpConfigToUse.factor === 'number') {
        valueToProcess = valueToProcess * dpConfigToUse.factor;
      }
      const mapped = applyValueMapping(valueToProcess, linkToUse);

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

  const currentNumericPowerForDisplay = useMemo<number | undefined>(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      let valueToProcess: any = reactivePowerValue;
      if (typeof valueToProcess === 'number' && typeof powerDataPointConfig.factor === 'number') {
        valueToProcess = valueToProcess * powerDataPointConfig.factor;
      }
      const mapped = applyValueMapping(valueToProcess, powerLink);

      if (typeof mapped === 'number') return mapped;
      if (typeof mapped === 'string') {
        const p = parseFloat(mapped.replace(/[^\d.-]/g, ''));
        return isNaN(p) ? undefined : p;
      }
      if (typeof mapped === 'boolean') return mapped ? (data.config?.powerRatingWp || 100) : 0;
    }
    // Fallback to logic power if display-specific power isn't available
    return currentNumericPowerForLogic;
  }, [powerLink, powerDataPointConfig, reactivePowerValue, currentNumericPowerForLogic, data.config?.powerRatingWp]);

  const powerRatingWp = useMemo(() => data.config?.powerRatingWp, [data.config?.powerRatingWp]);

  const panelOutputStateDerived = useMemo((): StandardNodeState => {
    const power = currentNumericPowerForLogic;
    if (power === undefined) return 'UNKNOWN';
    const isGenerallyOk = ['nominal', 'ok', 'online', 'standby', 'idle', ''].includes(processedStatus);

    if (power > 0.01) {
      if (!powerRatingWp || powerRatingWp <= 0) return 'PRODUCING_MEDIUM';
      const ratio = power / powerRatingWp;
      if (ratio >= 0.7) return 'PRODUCING_HIGH';
      if (ratio >= 0.15) return 'PRODUCING_MEDIUM';
      return 'PRODUCING_LOW';
    } else if (power < -0.01) {
      return 'CONSUMING';
    }
    const isDayTimeAssumed = (new Date().getHours() > 6 && new Date().getHours() < 20);
    return isGenerallyOk ? (isDayTimeAssumed ? 'IDLE_DAY' : 'IDLE_NIGHT') : (isDayTimeAssumed ? 'IDLE_DAY' : 'IDLE_NIGHT');

  }, [currentNumericPowerForLogic, powerRatingWp, processedStatus]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
    if (processedStatus === 'fault') return 'FAULT';
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline' || processedStatus === 'off') return 'OFFLINE';
    return panelOutputStateDerived;
  }, [processedStatus, panelOutputStateDerived]);

  const appearance = useMemo(() => {
    let specificAppearance = getNodeAppearanceFromState(standardNodeState, SLDElementType.Panel);
    if (standardNodeState.startsWith('PRODUCING')) {
      specificAppearance.iconColorVar = 'var(--sld-color-producing-panel)';
      specificAppearance.mainStatusColorVar = 'var(--sld-color-producing-panel)';
      specificAppearance.glowColorVar = 'var(--sld-color-producing-panel-glow)';
    } else if (standardNodeState === 'IDLE_NIGHT') {
      specificAppearance.iconColorVar = 'var(--sld-color-night-panel)';
      specificAppearance.mainStatusColorVar = 'var(--sld-color-night-panel)';
      specificAppearance.glowColorVar = 'transparent';
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
      specificAppearance.mainStatusColorVar = 'var(--sld-color-offline-panel-icon)';
      specificAppearance.glowColorVar = 'transparent';
    } else if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
      const colorVar = standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)';
      specificAppearance.iconColorVar = colorVar;
      specificAppearance.mainStatusColorVar = colorVar;
      specificAppearance.glowColorVar = colorVar;
    }
    specificAppearance.statusTextColorVar = specificAppearance.statusTextColorVar || 'var(--sld-color-text)';
    return specificAppearance;

  }, [standardNodeState]);

  const isProducing = useMemo(() => standardNodeState.startsWith('PRODUCING'), [standardNodeState]);
  const isConsuming = useMemo(() => standardNodeState === 'CONSUMING', [standardNodeState]);


  const productionRatio = useMemo<number>(() => {
    const power = currentNumericPowerForLogic;
    if (isProducing && powerRatingWp && powerRatingWp > 0 && power !== undefined && power > 0) {
      return Math.max(0, Math.min(1, power / powerRatingWp));
    }
    return 0;
  }, [isProducing, currentNumericPowerForLogic, powerRatingWp]);

  const consumptionRatio = useMemo<number>(() => {
    const power = currentNumericPowerForLogic;
    if (isConsuming && powerRatingWp && powerRatingWp > 0 && power !== undefined && power < 0) {
      return Math.max(0, Math.min(1, Math.abs(power) / (powerRatingWp * 0.20)));
    }
    return 0;
  }, [isConsuming, currentNumericPowerForLogic, powerRatingWp]);


  const displayStatusText = useMemo<string>(() => {
    switch (standardNodeState) {
      case 'FAULT': return "Fault";
      case 'WARNING': return "Warning";
      case 'OFFLINE': return "Offline";
      case 'PRODUCING_HIGH': return "Peak Output";
      case 'PRODUCING_MEDIUM': return "Generating";
      case 'PRODUCING_LOW': return "Low Output";
      case 'IDLE_DAY': return "Idle (Day)";
      case 'IDLE_NIGHT': return "Idle (Night)";
      case 'CONSUMING': return "Consuming";
      case 'STANDBY': return "Standby";
      case 'UNKNOWN': return "Status N/A";
      default:
        const readableStatus = standardNodeState.replace(/_/g, ' ');
        return readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1).toLowerCase();
    }
  }, [standardNodeState]);

  const activeRatioForAnimation = isProducing ? productionRatio : (isConsuming ? consumptionRatio : 0);
  const animationGlowDuration = useMemo(() => {
    if (isProducing || isConsuming) return Math.max(0.8, 2.8 - activeRatioForAnimation * 2.0);
    return 3;
  }, [isProducing, isConsuming, activeRatioForAnimation]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStandardNodeState = useRef(standardNodeState);
  useEffect(() => {
    if (prevStandardNodeState.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1300);
      prevStandardNodeState.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';

  const calculatedMinHeight = 80;
  const calculatedMinWidth = 95;

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 1px 2px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.03)`;
    const faultWarningColor = standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)';

    if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
      currentBoxShadow = `0 0 0 1.5px ${faultWarningColor}, 0 0 8px 1px ${faultWarningColor.replace(')', ', 0.7)').replace('var(', 'rgba(')}`;
    }
    if (isRecentStatusChange && appearance.glowColorVar && appearance.glowColorVar !== 'transparent' && appearance.glowColorVar !== 'rgba(0,0,0,0)') {
      currentBoxShadow = `0 0 12px 3px ${appearance.glowColorVar.replace(')', ', 0.65)').replace('var(', 'rgba(')}`;
    }
    if (selected) {
      currentBoxShadow = `0 0 0 2px ${sldAccentVar.replace(')', ', 0.8)').replace('var(', 'rgba(')}, 0 0 12px 2px ${sldAccentVar.replace(')', ', 0.5)').replace('var(', 'rgba(')}`;
    }

    return {
      borderColor: selected ? sldAccentVar : appearance.borderColorVar,
      borderWidth: selected ? '1.5px' : '1px',
      boxShadow: currentBoxShadow,
      color: appearance.textColorVar,
      minWidth: `${calculatedMinWidth}px`,
      minHeight: `${calculatedMinHeight}px`,
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${calculatedMinWidth}px`,
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${calculatedMinHeight}px`,
      borderRadius: '0.375rem',
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || SLDElementType.Panel, position: nodePosition, data,
    selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0,
    width: nodeWidthFromData || calculatedMinWidth, height: nodeHeightFromData || calculatedMinHeight,
    connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);

  const formattedPowerOutputWithContext = useMemo<string>((): string => {
    const powerValForDisplay = currentNumericPowerForDisplay;

    if (powerValForDisplay === undefined) {
      let placeholderSuffix = 'W'; // Default placeholder suffix
      if (powerLink?.format?.suffix) {
        placeholderSuffix = powerLink.format.suffix;
      } else if (powerRatingWp) { // Infer from rated power for placeholder if actual is undefined
        const absRated = Math.abs(powerRatingWp);
        if (absRated >= 1_000_000_000) placeholderSuffix = 'GW';
        else if (absRated >= 1_000_000) placeholderSuffix = 'MW';
        else if (absRated >= 1000) placeholderSuffix = 'kW';
        // else 'W' is already set
      }
      // Show rated power if available, otherwise show N/A
      if (powerRatingWp) {
        let ratedValueToShow = powerRatingWp;
        let finalRatedSuffix = 'Wp';
        const absRatedPower = Math.abs(powerRatingWp);

        if (absRatedPower >= 1_000_000_000) {
          ratedValueToShow = powerRatingWp / 1_000_000_000;
          finalRatedSuffix = 'GWp';
        } else if (absRatedPower >= 1_000_000) {
          ratedValueToShow = powerRatingWp / 1_000_000;
          finalRatedSuffix = 'MWp';
        } else if (absRatedPower >= 1000) {
          ratedValueToShow = powerRatingWp / 1000;
          finalRatedSuffix = 'kWp';
        }

        let ratedPrecision: number;
        const absRatedValueToShow = Math.abs(ratedValueToShow);
        if (ratedValueToShow === 0) ratedPrecision = 0;
        else if (absRatedValueToShow >= 100) ratedPrecision = 0;
        else if (absRatedValueToShow >= 10) ratedPrecision = 1;
        else if (absRatedValueToShow >= 1) ratedPrecision = 2;
        else ratedPrecision = 2;

        const ratedFormat = { type: 'number' as const, precision: ratedPrecision, suffix: finalRatedSuffix };
        return formatDisplayValue(ratedValueToShow, ratedFormat, 'Float');
      }
      
      return powerLink ? `--- ${placeholderSuffix}` : "N/A";
    }

    let valueToFormat = powerValForDisplay;
    let displaySuffix = 'W';
    const absPower = Math.abs(powerValForDisplay);

    if (absPower >= 1_000_000_000) { // GW
      valueToFormat = powerValForDisplay / 1_000_000_000;
      displaySuffix = 'GW';
    } else if (absPower >= 1_000_000) { // MW
      valueToFormat = powerValForDisplay / 1_000_000;
      displaySuffix = 'MW';
    } else if (absPower >= 1000) { // kW
      valueToFormat = powerValForDisplay / 1000;
      displaySuffix = 'kW';
    }
    // Else: it's W, valueToFormat is powerValForDisplay, displaySuffix is 'W'.

    let calculatedPrecision: number;
    const configuredPrecisionForW = powerDataPointConfig?.decimalPlaces ?? powerLink?.format?.precision;

    if (displaySuffix === 'W' && configuredPrecisionForW !== undefined) {
      calculatedPrecision = configuredPrecisionForW;
    } else {
      const absValueToFormat = Math.abs(valueToFormat);
      if (valueToFormat === 0) {
        calculatedPrecision = 0;
      } else if (absValueToFormat >= 100) {
        calculatedPrecision = 0;
      } else if (absValueToFormat >= 10) {
        calculatedPrecision = 1;
      } else if (absValueToFormat >= 1) {
        calculatedPrecision = 2;
      } else {
        calculatedPrecision = 2;
      }
    }

    const displayFormatOptions = {
      type: 'number' as const,
      precision: calculatedPrecision,
      suffix: displaySuffix
    };

    let powerStr = formatDisplayValue(valueToFormat, displayFormatOptions, powerDataPointConfig?.dataType || 'Float');

    if (powerRatingWp) {
      let ratedValueToShow = powerRatingWp;
      let finalRatedSuffix = 'Wp';
      const absRatedPower = Math.abs(powerRatingWp);

      if (absRatedPower >= 1_000_000_000) {
        ratedValueToShow = powerRatingWp / 1_000_000_000;
        finalRatedSuffix = 'GWp';
      } else if (absRatedPower >= 1_000_000) {
        ratedValueToShow = powerRatingWp / 1_000_000;
        finalRatedSuffix = 'MWp';
      } else if (absRatedPower >= 1000) {
        ratedValueToShow = powerRatingWp / 1000;
        finalRatedSuffix = 'kWp';
      }

      let ratedPrecision: number;
      const absRatedValueToShow = Math.abs(ratedValueToShow);
      if (ratedValueToShow === 0) ratedPrecision = 0;
      else if (absRatedValueToShow >= 100) ratedPrecision = 0;
      else if (absRatedValueToShow >= 10) ratedPrecision = 1;
      else if (absRatedValueToShow >= 1) ratedPrecision = 2;
      else ratedPrecision = 2;

      const ratedFormat = { type: 'number' as const, precision: ratedPrecision, suffix: finalRatedSuffix };
      const ratedStr = formatDisplayValue(ratedValueToShow, ratedFormat, 'Float');

      return (powerValForDisplay === undefined && powerStr === "N/A") ? ratedStr : `${powerStr} / ${ratedStr}`;
    }
    return powerStr;
  }, [currentNumericPowerForDisplay, powerLink, powerDataPointConfig, powerRatingWp]);

  const showBreathingGlow = (isProducing || isConsuming) &&
    !selected &&
    !isRecentStatusChange &&
    standardNodeState !== 'FAULT' &&
    standardNodeState !== 'WARNING' &&
    appearance.glowColorVar &&
    appearance.glowColorVar !== 'transparent' &&
    appearance.glowColorVar !== 'rgba(0,0,0,0)';

  const activeRatio = isProducing ? productionRatio : (isConsuming ? consumptionRatio : 0);
  const glowBase = nodeMainStyle.boxShadow || '0 1px 2px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.03)';
  const glowColorToUse = (appearance.glowColorVar || appearance.mainStatusColorVar || 'var(--sld-color-accent)');

  return (
    <motion.div
      className={`panel-node group sld-node relative flex flex-col items-center 
                  border transition-all duration-150 ease-out 
                  ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
                  overflow-visible`}
      style={{ ...nodeMainStyle, background: `var(--sld-color-node-bg)` }}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        boxShadow: showBreathingGlow
          ? [
            glowBase,
            `${glowBase.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.02)`)}, 0 0 ${1.5 + activeRatio * 3.0}px ${0.3 + activeRatio * 1.0}px ${glowColorToUse.replace(')', `, ${0.15 + activeRatio * 0.12})`).replace('var(', 'rgba(')}`,
            `${glowBase.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.02)`)}, 0 0 ${2.5 + activeRatio * 5.5}px ${0.6 + activeRatio * 1.8}px ${glowColorToUse.replace(')', `, ${0.25 + activeRatio * 0.18})`).replace('var(', 'rgba(')}`,
            `${glowBase.replace(/rgba\(([^)]+)\)/g, `rgba($1,0.02)`)}, 0 0 ${1.5 + activeRatio * 3.0}px ${0.3 + activeRatio * 1.0}px ${glowColorToUse.replace(')', `, ${0.15 + activeRatio * 0.12})`).replace('var(', 'rgba(')}`,
            glowBase,
          ]
          : nodeMainStyle.boxShadow
      }}
      exit={{ opacity: 0, y: 8, scale: 0.93, transition: { duration: 0.12, ease: "easeOut" } }}
      transition={
        showBreathingGlow
          ? { type: 'spring', stiffness: 180, damping: 30, boxShadow: { duration: animationGlowDuration, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 260, damping: 22 }
      }
      whileHover={{
        scale: isNodeEditable ? 1.025 : 1.01,
        borderColor: selected ? appearance.borderColorVar : sldAccentVar,
        boxShadow: selected || isRecentStatusChange || standardNodeState === 'FAULT' || standardNodeState === 'WARNING'
          ? nodeMainStyle.boxShadow
          : `${glowBase}, 0 0 10px 2px ${glowColorToUse.replace(')', `, ${0.3 + activeRatio * 0.2})`).replace('var(', 'rgba(')}`
      }}
      onClick={(e) => {
        if (!isNodeEditable && !isEditMode) {
          e.stopPropagation();
          setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="dc_out"
        isConnectable={isConnectable}
        className="sld-handle-style !z-20"
        style={{
          background: (isProducing || standardNodeState === 'ENERGIZED')
            ? appearance.mainStatusColorVar
            : (isConsuming ? 'var(--sld-color-consuming-panel)' : 'var(--sld-color-deenergized)'),
          borderColor: 'var(--sld-color-handle-border)',
        }}
        title="DC Output"
      />

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 group/infobtn 
                     bg-transparent hover:bg-black/[.04] dark:hover:bg-white/[.04] p-0"
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className="h-3 w-3 text-gray-400 dark:text-gray-500 group-hover/infobtn:text-[var(--sld-color-accent)] transition-colors" />
        </Button>
      )}

      <div className="flex flex-col items-center justify-start w-full h-full px-1 pt-1 pb-0.5 pointer-events-none select-none space-y-0.5">
        <div className="w-full min-h-[30px] h-[30px] mb-px flex items-center justify-center flex-shrink-0">
          <DynamicPanelEnergyVisual
            appearance={appearance}
            productionRatio={productionRatio}
            consumptionRatio={consumptionRatio}
            standardNodeState={standardNodeState}
          />
        </div>

        <div className="flex flex-col items-center text-center w-full mt-0">
          <p
            className="text-[9px] font-semibold leading-normal w-full px-0.5 truncate"
            style={{ color: appearance.textColorVar }}
            title={data.label}
          >
            {data.label}
          </p>
          <div className="min-h-[12px] w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={`status-${displayStatusText}`}
                className="text-[7.5px] font-medium leading-normal w-full px-0.25"
                style={{ color: appearance.statusTextColorVar }} title={`Status: ${displayStatusText}`}
                initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.15, ease: "circOut" }}
              >
                {displayStatusText}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-0.5 text-[8px] font-semibold w-full mt-auto mb-px" title={`Power: ${currentNumericPowerForDisplay !== undefined ? formattedPowerOutputWithContext : (powerRatingWp ? `Rated: ${formattedPowerOutputWithContext}` : 'N/A')}`}>
          <BoltIcon
            size={7}
            className="transition-colors duration-200 flex-shrink-0 mr-px"
            style={{ color: (isProducing || isConsuming) ? appearance.iconColorVar : appearance.statusTextColorVar }}
          />
          <AnimatePresence mode="popLayout">
            <motion.span
              key={`power-${formattedPowerOutputWithContext}`}
              className="font-semibold leading-normal text-[10px]"
              style={{ color: appearance.statusTextColorVar }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            >
              {formattedPowerOutputWithContext.split(" / ")[0]}
              {formattedPowerOutputWithContext.includes(" / ") && (
                <span className="text-[7px] opacity-85 font-normal"> / {formattedPowerOutputWithContext.split(" / ")[1]}</span>
              )}
            </motion.span>
          </AnimatePresence>
          {powerOpcUaNodeId && currentNumericPowerForDisplay !== undefined && standardNodeState !== 'OFFLINE' && standardNodeState !== 'FAULT' && (
            <motion.div
              className="w-0.5 h-0.5 rounded-full ml-0.5 flex-shrink-0"
              style={{ backgroundColor: appearance.statusTextColorVar }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);