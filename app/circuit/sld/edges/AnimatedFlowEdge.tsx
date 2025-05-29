// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils';
import { 
    CustomFlowEdgeData, 
    AnimationFlowConfig, // The primary config type for an edge
    GlobalSLDAnimationSettings // For understanding the structure that SLDWidget might merge
} from '@/types/sld'; 
import { useAppStore } from '@/stores/appStore';

// Centralized styling for consistency
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

// SLDWidget.tsx passes down the `animationSettings` on `data`.
// This `animationSettings` could be edge-specific or derived from global defaults.
// If derived from global, it might include `globallyInvertDefaultDynamicFlowLogic`.
type EffectiveEdgeData = CustomFlowEdgeData & { // CustomFlowEdgeData.animationSettings is AnimationFlowConfig
  // SLDWidget will merge GlobalSLDAnimationSettings into the edge's effective animationSettings
  // if the edge is using global defaults. So animConfig below can be cast or checked for this field.
};

export default function AnimatedFlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, data, selected,
}: EdgeProps<EffectiveEdgeData>) {
  
  const { opcUaNodeValues, dataPoints } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
    borderRadius: 5,
  });

  let edgeStrokeColor = flowColors.OFFLINE;
  let edgeStrokeWidth = voltageStrokeWidths[(data?.voltageLevel as keyof typeof voltageStrokeWidths) || 'DEFAULT'] || voltageStrokeWidths.DEFAULT;
  const baseStrokeDasharray = '8 6'; // Updated dash pattern

  let flowActive = false; 
  let animationName = 'none';
  let animationDirection: 'normal' | 'reverse' = 'normal'; 
  let animationDuration = '20s'; 

  const animConfig = data?.animationSettings; // This is AnimationFlowConfig from types/sld.ts
  // Access the global invert flag, SLDWidget should ensure this is present if applicable.
  const masterGlobalInvertActive = (animConfig as GlobalSLDAnimationSettings)?.globallyInvertDefaultDynamicFlowLogic ?? false;


  // --- Determine Animation Behavior based on animationType ---
  const currentAnimationType = animConfig?.animationType || 'none';

  if (currentAnimationType === 'dynamic_power_flow') {
    let netFlowValue = 0;
    if (animConfig?.gridNetFlowDataPointId) {
      const rawGridNetValue = getDataPointValue(animConfig.gridNetFlowDataPointId, dataPoints, opcUaNodeValues);
      netFlowValue = typeof rawGridNetValue === 'number' && !isNaN(rawGridNetValue) ? rawGridNetValue : 0;
    } else if (animConfig?.generationDataPointId && animConfig?.usageDataPointId) {
      const rawGenValue = getDataPointValue(animConfig.generationDataPointId, dataPoints, opcUaNodeValues);
      const rawUsageValue = getDataPointValue(animConfig.usageDataPointId, dataPoints, opcUaNodeValues);
      const genValue = typeof rawGenValue === 'number' && !isNaN(rawGenValue) ? rawGenValue : 0;
      const usageValue = typeof rawUsageValue === 'number' && !isNaN(rawUsageValue) ? rawUsageValue : 0;
      netFlowValue = genValue - usageValue;
    }

    // 1. Base Calculated Direction (NEW DEFAULT: Positive Net Flow/Export/Gen>Use => Target -> Source (reverse))
    let baseCalculatedDirection: 'normal' | 'reverse' = 'normal'; // Default for netFlowValue === 0
    if (netFlowValue > 0) { baseCalculatedDirection = 'reverse'; } 
    else if (netFlowValue < 0) { baseCalculatedDirection = 'normal'; }
    
    flowActive = netFlowValue !== 0;

    // 2. Apply Global Master Invert for Dynamic Flow
    let directionAfterGlobalInvert = baseCalculatedDirection;
    if (masterGlobalInvertActive && flowActive) {
      directionAfterGlobalInvert = (baseCalculatedDirection === 'normal') ? 'reverse' : 'normal';
    }

    // 3. Apply Edge-Specific Invert for Dynamic Flow
    animationDirection = directionAfterGlobalInvert;
    if (animConfig?.invertFlowDirection && flowActive) {
      animationDirection = (directionAfterGlobalInvert === 'normal') ? 'reverse' : 'normal';
    }
    
    // Speed for Dynamic Flow
    if (flowActive) {
      const differenceMagnitude = Math.abs(netFlowValue);
      const safeSpeedMultiplier = Math.max(0.01, animConfig?.speedMultiplier ?? 1);
      const BASE_SPEED_ADJUSTMENT_FACTOR = 0.3; 
      const speedFactor = differenceMagnitude * safeSpeedMultiplier * BASE_SPEED_ADJUSTMENT_FACTOR;
      if (speedFactor > 0.001) { // Avoid division by zero or extremely slow if diff is tiny
        const clampedSpeedFactor = Math.max(0.1, Math.min(speedFactor, 150)); // Adjusted max clamp for wider speed range
        animationDuration = `${Math.max(0.3, Math.min(45, 30 / clampedSpeedFactor))}s`; // Adjusted base factors and clamps
        animationName = 'dashdraw';
      } else {
        flowActive = false; 
        animationName = 'none';
      }
    } else {
      animationName = 'none';
    }

  } else if (currentAnimationType === 'constant_unidirectional') {
    animationDirection = animConfig?.constantFlowDirection === 'forward' ? 'normal' : 
                         animConfig?.constantFlowDirection === 'reverse' ? 'reverse' : 
                         'normal'; // Default to 'normal' if undefined

    // Determine constant speed based on preset or custom numeric value
    const speedSetting = animConfig?.constantFlowSpeed;
    if (speedSetting === 'slow') animationDuration = '3s';
    else if (speedSetting === 'medium') animationDuration = '1.5s';
    else if (speedSetting === 'fast') animationDuration = '0.8s';
    else if (typeof speedSetting === 'number' && speedSetting > 0) {
      animationDuration = `${Math.max(0.3, Math.min(10, speedSetting))}s`; // Custom duration, clamped
    } else {
      animationDuration = '1.5s'; // Default to medium if speedSetting is invalid
    }

    // Check activation DP if provided
    if (animConfig?.constantFlowActivationDataPointId) {
      const rawActivationValue = getDataPointValue(animConfig.constantFlowActivationDataPointId, dataPoints, opcUaNodeValues);
      flowActive = !!rawActivationValue; // Active if true, inactive if false/undefined/null
    } else {
      flowActive = true; // Always active if no activation DP
    }

    animationName = flowActive ? 'dashdraw' : 'none';

  } else { // animationType is 'none' or fallback for older data / incomplete config
    const isEnergizedLink = data?.dataPointLinks?.find(l => l.targetProperty === 'isEnergized');
    if (isEnergizedLink) {
        const rawIsEnergized = getDataPointValue(isEnergizedLink.dataPointId, dataPoints, opcUaNodeValues);
        flowActive = !!(isEnergizedLink.valueMapping ? applyValueMapping(rawIsEnergized, isEnergizedLink) : rawIsEnergized);
    } else {
        flowActive = data?.isEnergized ?? false; 
    }
    animationName = flowActive ? 'dashdraw' : 'none'; // Simple on/off animation
    animationDuration = '2s'; // Generic slow speed for this fallback
    animationDirection = 'normal'; // Default direction
  }

  // --- Determine Edge Base Color (Based on flowType and flowActive state) ---
  if (flowActive) {
    if (data?.flowType) {
        const ftk = `${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors;
        edgeStrokeColor = flowColors[ftk] || 
                          (data.flowType === 'CONTROL_SIGNAL' ? flowColors.CONTROL_SIGNAL : 
                           data.flowType === 'AUX_POWER' ? flowColors.AUX_POWER : 
                           flowColors.ENERGIZED_DEFAULT);
    } else {
        edgeStrokeColor = flowColors.ENERGIZED_DEFAULT; 
    }
  } else {
    // Retain specific colors for CONTROL_SIGNAL or AUX_POWER even if not "flowing" (animated)
    // to show they are present/configured, unless explicitly an offline/fault/warning status.
    if (data?.flowType === 'CONTROL_SIGNAL' && !(data.status === 'FAULT' || data.status === 'WARNING' || data.status === 'OFFLINE' || data.isEnergized === false)) {
        edgeStrokeColor = flowColors.CONTROL_SIGNAL;
    } else if (data?.flowType === 'AUX_POWER' && !(data.status === 'FAULT' || data.status === 'WARNING' || data.status === 'OFFLINE' || data.isEnergized === false)) {
        edgeStrokeColor = flowColors.AUX_POWER;
    } else {
        edgeStrokeColor = flowColors.OFFLINE; 
    }
  }
  
  // --- Status Overrides (Fault/Warning) - Highest priority for color and specific animation ---
  const statusLink = data?.dataPointLinks?.find(link => link.targetProperty === 'status');
  let statusValueFromLink: string | null = null;
  if (statusLink) {
    const rawStatus = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues);
    statusValueFromLink = String(statusLink.valueMapping ? applyValueMapping(rawStatus, statusLink) : rawStatus).toUpperCase();
  }
  const finalStatus: string = statusValueFromLink || String(data?.status || '').toUpperCase(); // Prefer DPLinked status

  if (finalStatus === 'FAULT') {
    edgeStrokeColor = flowColors.FAULT;
    animationName = 'faultPulse'; 
    animationDuration = '1s';
    // Set CSS variable for base stroke width for the animation
    if (finalBasePathStyle) { // Ensure finalBasePathStyle is defined
        (finalBasePathStyle as any)['--base-stroke-width'] = `${edgeStrokeWidth}px`;
    }
    // animationDirection can remain as previously calculated for fault context, or default to 'normal'
  } else if (finalStatus === 'WARNING') {
    if(edgeStrokeColor !== flowColors.FAULT) edgeStrokeColor = flowColors.WARNING; // Don't let warning override fault color
    // Keep general animation if active, or add subtle pulse if it was 'none' and not a fault
    if (animationName === 'none') { // Since we're already in the WARNING branch, FAULT is not possible here
      animationName = 'subtlePulse'; // Or specific warning pulse
      animationDuration = '1.8s';
    }
  }
  
  // Final check: if not faultPulse and main animation is dashdraw but ended up not flowActive (e.g., Gen=Usage, or constant flow inactive), then no dash animation.
  if (animationName === 'dashdraw' && !flowActive) {
    animationName = 'none';
  }

  // --- Selected State Styling ---
  if (selected) {
    edgeStrokeColor = flowColors.SELECTED_STROKE;
    edgeStrokeWidth += SELECTED_STROKE_WIDTH_INCREASE;
    // If selected & should be animated but animationName is 'none' (e.g., due to 0 net flow, or constant flow paused)
    // AND it's not a fault (faultPulse takes precedence).
    if (animationName === 'none' && flowActive && finalStatus !== 'FAULT') { 
        animationName = 'subtlePulse'; 
        animationDuration = '2s';
    }
    // Apply SVG filter for selected state
    if (finalBasePathStyle) { // Ensure finalBasePathStyle is defined
        (finalBasePathStyle as any).filter = `url(#selected-edge-glow-${id})`;
    }
  }

  // --- Final Style Assembly for the Base Path ---
  // finalBasePathStyle is initialized before this block if selected is true
  // This ensures that if it wasn't initialized (selected is false), it gets initialized here.
  // Or, more cleanly, initialize it once before the 'selected' block.
  const finalBasePathStyle: React.CSSProperties = { // Initialized or re-initialized here for clarity
    ...style,
    stroke: edgeStrokeColor,
    strokeWidth: edgeStrokeWidth,
    strokeLinecap: 'round',
  };
  
  // Re-apply filter if selected, as finalBasePathStyle might have been re-initialized
  if (selected) {
    (finalBasePathStyle as any).filter = `url(#selected-edge-glow-${id})`;
  }
  // Re-apply --base-stroke-width for fault state if it was re-initialized
  if (finalStatus === 'FAULT') {
    (finalBasePathStyle as any)['--base-stroke-width'] = `${edgeStrokeWidth - (selected ? SELECTED_STROKE_WIDTH_INCREASE : 0)}px`; // Use original width before selection increase
  }


  if (animationName !== 'none') {
    finalBasePathStyle.strokeDasharray = baseStrokeDasharray;
    finalBasePathStyle.animationName = animationName; // CSS @keyframes: 'dashdraw', 'faultPulse', 'subtlePulse'
    finalBasePathStyle.animationDuration = animationDuration;
    finalBasePathStyle.animationDirection = animationDirection; 
    finalBasePathStyle.animationIterationCount = 'infinite';
    finalBasePathStyle.animationTimingFunction = 'linear'; // Default is linear, can be overridden by specific animation if needed
    if (animationName === 'faultPulse' || animationName === 'subtlePulse') {
        finalBasePathStyle.animationTimingFunction = 'ease-in-out'; // Override for pulse animations
    }
  }
  
  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id={`selected-edge-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            {/* Using feDropShadow for a simpler glow effect */}
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={flowColors.SELECTED_STROKE} floodOpacity="0.75" />
          </filter>
        </defs>
      </svg>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={finalBasePathStyle} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--edge-label-bg, var(--background, #fff))', 
              color: 'var(--edge-label-text, var(--foreground, #111))',
              padding: '2px 6px',
              borderRadius: '6px', 
              fontSize: '10px',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)', 
              pointerEvents: 'all', 
              opacity: selected || animationName !== 'none' ? 1 : 0.8, 
              transition: 'opacity 0.15s ease-in-out, border-color 0.15s ease-in-out',
              border: `1px solid ${
                selected 
                ? flowColors.SELECTED_STROKE 
                : (flowActive || finalStatus === 'FAULT' || finalStatus === 'WARNING') 
                  ? edgeStrokeColor 
                  : 'var(--edge-label-border-inactive, var(--border-subtle, rgba(0,0,0,0.1)))' 
              }`,
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