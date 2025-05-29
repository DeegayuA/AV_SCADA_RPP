// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, SLDLayout } from 'reactflow'; // Added SLDLayout for type
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils';
import { CustomFlowEdgeData } from '@/types/sld'; // CustomFlowEdgeData should already include animationSettings and an optional globalAnimationSettings from the dynamic injection
import { useAppStore } from '@/stores/appStore';

// Centralized styling for consistency (assuming this is already defined as is)
const flowColors = {
  AC_HV: '#FFBF00',      // Bright Yellow-Orange
  AC_MV: '#FFA500',      // Orange
  AC_LV: '#FF8C00',      // DarkOrange
  DC_HV: '#1E90FF',      // DodgerBlue
  DC_MV: '#00BFFF',      // DeepSkyBlue
  DC_LV: '#87CEFA',      // LightSkyBlue
  CONTROL_SIGNAL: '#32CD32', // LimeGreen
  AUX_POWER: '#DA70D6',  // Orchid
  ENERGIZED_DEFAULT: '#7CFC00', // LawnGreen (generic energized)
  OFFLINE: '#A9A9A9',    // DarkGray (de-energized, default)
  FAULT: '#FF0000',      // Bright Red (highest priority)
  WARNING: '#FFD700',    // Gold/Yellow (clear warning)
  SELECTED_STROKE: '#007AFF', // iOS Blue (distinct selection)
};

const voltageStrokeWidths = {
  HV: 4.5, MV: 3.5, LV: 2.5, ELV: 2.0, DEFAULT: 2.5,
};
const SELECTED_STROKE_WIDTH_INCREASE = 1.5;

// Define the expected structure of data more accurately for props
// Note: globalAnimationSettings is injected by SLDWidget.tsx and isn't part of types/sld.ts's CustomFlowEdgeData
type AnimatedFlowEdgeDataWithGlobal = CustomFlowEdgeData & {
  globalAnimationSettings?: SLDLayout['meta']['globalAnimationSettings'];
};

export default function AnimatedFlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, data, selected,
}: EdgeProps<AnimatedFlowEdgeDataWithGlobal>) {
  
  const { opcUaNodeValues, dataPoints } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  // --- Initialize Base Visual Properties ---
  let edgeStrokeColor = flowColors.OFFLINE; // Default to offline
  let edgeStrokeWidth = voltageStrokeWidths[(data?.voltageLevel as keyof typeof voltageStrokeWidths) || 'DEFAULT'] || voltageStrokeWidths.DEFAULT;
  const baseStrokeDasharray = '10 4';

  // Apply static flowType color if available (will be overridden by animation logic if active)
  if (data?.flowType) {
    const flowTypeKey = `${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors;
    if (flowColors[flowTypeKey]) {
      edgeStrokeColor = flowColors[flowTypeKey];
    } else if (data.flowType === 'CONTROL_SIGNAL') {
      edgeStrokeColor = flowColors.CONTROL_SIGNAL;
    } else if (data.flowType === 'AUX_POWER') {
      edgeStrokeColor = flowColors.AUX_POWER;
    } else {
      edgeStrokeColor = flowColors.ENERGIZED_DEFAULT; // If flowType is set but not in map, assume energized
    }
  }
  
  // --- Determine Active Animation Configuration ---
  const edgeSpecificSettings = data?.animationSettings;
  const globalSettings = data?.globalAnimationSettings;

  let activeGenerationDpId: string | undefined = undefined;
  let activeUsageDpId: string | undefined = undefined;
  let activeSpeedMultiplier: number = 1; // Default multiplier
  let useNewAnimationSystem = false;

  if (globalSettings?.isEnabled) {
    activeGenerationDpId = globalSettings.generationDataPointId;
    activeUsageDpId = globalSettings.usageDataPointId;
    activeSpeedMultiplier = globalSettings.speedMultiplier ?? 1;
    useNewAnimationSystem = true;
  } else if (edgeSpecificSettings?.generationDataPointId && edgeSpecificSettings?.usageDataPointId) {
    activeGenerationDpId = edgeSpecificSettings.generationDataPointId;
    activeUsageDpId = edgeSpecificSettings.usageDataPointId;
    activeSpeedMultiplier = edgeSpecificSettings.speedMultiplier ?? 1;
    useNewAnimationSystem = true;
  }

  // --- Initialize Animation Variables ---
  let flowActive = false;
  let animationName = 'none';
  let animationDirection = 'normal';
  let animationDuration = '20s'; // Default, can be overridden

  // --- New Animation Logic (Generation vs. Usage) ---
  if (useNewAnimationSystem && activeGenerationDpId && activeUsageDpId) {
    const rawGenValue = getDataPointValue(activeGenerationDpId, opcUaNodeValues, dataPoints);
    const rawUsageValue = getDataPointValue(activeUsageDpId, opcUaNodeValues, dataPoints);
    const genValue = typeof rawGenValue === 'number' ? rawGenValue : 0;
    const usageValue = typeof rawUsageValue === 'number' ? rawUsageValue : 0;

    if (genValue > usageValue) {
      flowActive = true;
      animationDirection = 'normal'; // Forward
    } else if (usageValue > genValue) {
      flowActive = true;
      animationDirection = 'reverse'; // Reverse
    } // Else: genValue == usageValue or invalid, flowActive remains false

    if (flowActive) {
      const difference = Math.abs(genValue - usageValue);
      // Ensure multiplier is positive and non-zero to avoid division by zero or no animation
      const safeSpeedMultiplier = Math.max(0.01, activeSpeedMultiplier); 
      const speedFactor = difference * safeSpeedMultiplier;
      
      if (speedFactor > 0) {
        animationDuration = `${Math.max(0.2, Math.min(30, 20 / speedFactor))}s`; // Clamp duration
        animationName = 'dashdraw';
      } else {
        // If speedFactor is 0 (e.g., multiplier is 0, or diff is 0 and somehow flowActive was true), no animation
        flowActive = false; 
        animationName = 'none';
      }
    }
  } else if (!useNewAnimationSystem && data?.dataPointLinks?.length) {
    // --- Fallback to Old DataPointLink System (if no new system config for this edge) ---
    // This section should be reviewed: is it purely for fallback or should it be removed?
    // For now, keeping a simplified version of old logic if new system isn't used.
    const isEnergizedLink = data.dataPointLinks.find(l => l.targetProperty === 'isEnergized');
    if (isEnergizedLink) {
        const rawIsEnergized = getDataPointValue(isEnergizedLink.dataPointId, opcUaNodeValues, dataPoints);
        flowActive = !!(isEnergizedLink.valueMapping ? applyValueMapping(rawIsEnergized, isEnergizedLink) : rawIsEnergized);
    } else {
        flowActive = data?.isEnergized ?? false; // Fallback to static if no link
    }

    if (flowActive) {
        animationName = 'dashdraw'; // Default animation for active flow
        const oldFlowLink = data.dataPointLinks.find(l => l.targetProperty === 'flowDirection');
        if (oldFlowLink) {
            const rawFlowVal = getDataPointValue(oldFlowLink.dataPointId, opcUaNodeValues, dataPoints);
            const mappedFlow = oldFlowLink.valueMapping ? applyValueMapping(rawFlowVal, oldFlowLink) : rawFlowVal;
            if (mappedFlow === 'reverse' || (typeof mappedFlow === 'number' && mappedFlow < 0)) animationDirection = 'reverse';
            else if (mappedFlow === 'none' || mappedFlow === 0) animationName = 'none';
        }
        
        const oldSpeedLink = data.dataPointLinks.find(l => l.targetProperty === 'animationSpeedFactor' || l.targetProperty === 'currentLoadPercent');
        if (oldSpeedLink) {
            const rawSpeedVal = getDataPointValue(oldSpeedLink.dataPointId, opcUaNodeValues, dataPoints);
            const mappedSpeed = oldSpeedLink.valueMapping ? applyValueMapping(rawSpeedVal, oldSpeedLink) : rawSpeedVal;
            if (typeof mappedSpeed === 'number' && mappedSpeed > 0) {
                const speedFactor = oldSpeedLink.targetProperty === 'animationSpeedFactor' ? mappedSpeed : Math.max(0, Math.min(mappedSpeed / 100, 2));
                const effectiveSpeedFactor = Math.max(0, Math.min(speedFactor, 5));
                animationDuration = `${Math.max(0.5, Math.min(60, 20 / (1 + effectiveSpeedFactor * 2)))}s`;
            }
        }
    } else {
        animationName = 'none';
    }
  } else {
    // If no new system and no old DPLinks, use static isEnergized (already handled by initial flowActive setting for old system)
    // Or, if there are no DPLinks at all, rely on static isEnergized.
     flowActive = data?.isEnergized ?? false;
     if (flowActive) {
        animationName = 'dashdraw';
        // Potentially use static direction/speed if they were part of CustomFlowEdgeData, but they are not.
     } else {
        animationName = 'none';
     }
  }

  // --- Determine Edge Color based on Flow State and Static Type ---
  if (flowActive) {
    // If flow is active, use type-specific color or default energized color.
    // This re-applies type color if it was OFFLINE initially.
    if (data?.flowType) {
        const flowTypeKey = `${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors;
        if (flowColors[flowTypeKey]) edgeStrokeColor = flowColors[flowTypeKey];
        else if (data.flowType === 'CONTROL_SIGNAL') edgeStrokeColor = flowColors.CONTROL_SIGNAL;
        else if (data.flowType === 'AUX_POWER') edgeStrokeColor = flowColors.AUX_POWER;
        else edgeStrokeColor = flowColors.ENERGIZED_DEFAULT;
    } else {
        edgeStrokeColor = flowColors.ENERGIZED_DEFAULT; 
    }
  } else {
    // If not flowActive (and not FAULT/WARNING yet), set to OFFLINE.
     if (edgeStrokeColor !== flowColors.FAULT && edgeStrokeColor !== flowColors.WARNING) { // Check to avoid overriding fault/warning
        edgeStrokeColor = flowColors.OFFLINE;
     }
  }
  
  // --- Status Overrides (Fault/Warning) - Applied AFTER new animation logic ---
  // This uses DataPointLinks for 'status'. This can remain as a separate way to indicate faults.
  const statusLink = data?.dataPointLinks?.find(link => link.targetProperty === 'status');
  if (statusLink) { // Removed opcUaNodeValues && dataPoints check as they are always available from store
    const rawStatusValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints);
    const mappedStatusValue = statusLink.valueMapping ? applyValueMapping(rawStatusValue, statusLink) : rawStatusValue;
    
    if (String(mappedStatusValue).toUpperCase() === 'FAULT') {
        edgeStrokeColor = flowColors.FAULT;
        animationName = 'faultPulse'; 
        animationDuration = '1s'; 
        flowActive = true; // Fault implies some form of activity/attention
    } else if (String(mappedStatusValue).toUpperCase() === 'WARNING') {
        if(edgeStrokeColor !== flowColors.FAULT) edgeStrokeColor = flowColors.WARNING; // Don't let warning override fault
        // Keep animationName and duration from flow logic unless a specific warning animation is desired
    }
  } else if (data?.status === 'FAULT') { // Static fault status
    edgeStrokeColor = flowColors.FAULT;
    animationName = 'faultPulse'; animationDuration = '1s'; flowActive = true;
  } else if (data?.status === 'WARNING' && edgeStrokeColor !== flowColors.FAULT) { // Static warning status
     edgeStrokeColor = flowColors.WARNING;
  }
  
  // Final check: if not flowActive (e.g. Gen==Usage, or not configured) AND not a fault pulse, then no animation.
  if (!flowActive && animationName !== 'faultPulse') {
    animationName = 'none';
  }

  // --- Selected State Styling (Applied Last) ---
  if (selected) {
    edgeStrokeColor = flowColors.SELECTED_STROKE;
    edgeStrokeWidth += SELECTED_STROKE_WIDTH_INCREASE;
    if (animationName === 'none' && flowActive) { // If it would have animated but is now 'none' due to no gen/usage diff
        animationName = 'subtlePulse'; // Keep it alive if selected and was supposed to be active
        animationDuration = '2s';
    } else if (animationName === 'none' && !flowActive) { // If truly offline but selected
        // No animation for selected offline, or a very subtle one if desired.
        // For now, no animation if not flowActive.
    }
  }

  // --- Final Assembled Style ---
  const finalStyle: React.CSSProperties = {
    ...style,
    stroke: edgeStrokeColor,
    strokeWidth: edgeStrokeWidth,
  };

  if (animationName !== 'none') {
    finalStyle.strokeDasharray = baseStrokeDasharray;
    finalStyle.animationName = animationName;
    finalStyle.animationDuration = animationDuration;
    finalStyle.animationDirection = animationDirection;
    finalStyle.animationIterationCount = 'infinite';
    finalStyle.animationTimingFunction = 'linear';
  }
  
  // Remove temporary console logs from previous step
  // console.log(`Edge ${id}: Global Settings:`, globalSettings);
  // console.log(`Edge ${id}: Edge Specific Settings:`, edgeSpecificSettings);
  // console.log(`Edge ${id}: Active DPs: GenDP=${activeGenerationDpId}, UsageDP=${activeUsageDpId}, SpeedMult=${activeSpeedMultiplier}`);
  // console.log(`Edge ${id}: flowActive=${flowActive}, animationName=${animationName}, duration=${animationDuration}, direction=${animationDirection}, color=${edgeStrokeColor}`);


  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={finalStyle} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--background, var(--bg-background, #ffffff))',
              color: 'var(--foreground, var(--text-primary, #000000))',
              padding: '2px 5px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              pointerEvents: 'all',
              opacity: selected ? 1 : 0.9,
              transition: 'opacity 0.15s ease-in-out',
              border: `1px solid var(--border, ${selected ? flowColors.SELECTED_STROKE : edgeStrokeColor === flowColors.OFFLINE ? 'transparent' : edgeStrokeColor})`,
            }}
            className="nodrag nopan react-flow__edge-label"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
