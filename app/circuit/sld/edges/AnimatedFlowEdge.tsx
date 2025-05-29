// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, EdgeLabelRenderer } from 'reactflow';
import { getSmoothStepPath } from '@xyflow/react';
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils';
import {
    CustomFlowEdgeData,
    AnimationFlowConfig,
    GlobalSLDAnimationSettings
} from '@/types/sld';
import { useAppStore } from '@/stores/appStore';

// --- Theming-aware Styling Constants (using CSS Variables) ---
const flowColors = {
  AC_HV: 'var(--edge-color-ac-hv)',
  AC_MV: 'var(--edge-color-ac-mv)',
  AC_LV: 'var(--edge-color-ac-lv)',
  DC_HV: 'var(--edge-color-dc-hv)',
  DC_MV: 'var(--edge-color-dc-mv)',
  DC_LV: 'var(--edge-color-dc-lv)',
  CONTROL_SIGNAL: 'var(--edge-color-control-signal)',
  DATA_BUS: 'var(--edge-color-data-bus)',
  AUX_POWER: 'var(--edge-color-aux-power)',
  ENERGIZED_DEFAULT: 'var(--edge-color-energized-default)',
  OFFLINE: 'var(--edge-color-offline)',
  FAULT: 'var(--edge-color-fault)',
  WARNING: 'var(--edge-color-warning)',
  SELECTED_STROKE: 'var(--edge-color-selected)',
};

const flowTypeStrokeWidths = {
  AC_HV: 4.5, AC_MV: 3.5, AC_LV: 2.5,
  DC_HV: 4.5, DC_MV: 3.5, DC_LV: 2.5,
  CONTROL_SIGNAL: 2.2,
  DATA_BUS: 2.8,
  AUX_POWER: 2.5,
  DEFAULT: 2.5,
};
const SELECTED_STROKE_WIDTH_INCREASE = 1.5;
const ANIMATED_DASH_WIDTH_FACTOR = 0.6;
const MIN_ANIMATED_DASH_WIDTH = 1.8;

// Interface for style object that includes our CSS custom property
interface AnimatedPathStyle extends React.CSSProperties {
  '--edge-animation-dashoffset-end'?: string;
}

type EffectiveEdgeData = CustomFlowEdgeData & {};

export default function AnimatedFlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd, data, selected, style
}: EdgeProps<EffectiveEdgeData>) {

  const { opcUaNodeValues, dataPoints } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  // --- Stage 1: Initial animation properties ---
  let s1_isConceptuallyActive = false;
  let s1_isDashdrawCandidate = false;
  let s1_dashdrawDirection: 'normal' | 'reverse' = 'normal';
  let s1_dashdrawDuration = '5s'; // Your default duration

  const animConfig = data?.animationSettings;
  const masterGlobalInvertActive = (animConfig as GlobalSLDAnimationSettings)?.globallyInvertDefaultDynamicFlowLogic ?? false;
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

    let baseCalculatedDirection: 'normal' | 'reverse' = 'normal';
    if (netFlowValue > 0) baseCalculatedDirection = 'reverse';
    else if (netFlowValue < 0) baseCalculatedDirection = 'normal';
    
    s1_isConceptuallyActive = true;
    s1_isDashdrawCandidate = netFlowValue !== 0;

    let directionAfterGlobalInvert = baseCalculatedDirection;
    if (masterGlobalInvertActive && s1_isDashdrawCandidate) {
      directionAfterGlobalInvert = (baseCalculatedDirection === 'normal') ? 'reverse' : 'normal';
    }
    s1_dashdrawDirection = directionAfterGlobalInvert;
    if (animConfig?.invertFlowDirection && s1_isDashdrawCandidate) {
      s1_dashdrawDirection = (directionAfterGlobalInvert === 'normal') ? 'reverse' : 'normal';
    }
    
if (s1_isDashdrawCandidate) {
      const differenceMagnitude = Math.abs(netFlowValue);
      const safeSpeedMultiplier = Math.max(0.1, animConfig?.speedMultiplier ?? 10); // Ensure a minimum multiplier to avoid zero speed
      const BASE_SPEED_ADJUSTMENT_FACTOR = 5; // Keep this low for slower base speed
      const speedFactor = differenceMagnitude * safeSpeedMultiplier * BASE_SPEED_ADJUSTMENT_FACTOR;
      
      if (speedFactor > 0.001) {
        const clampedSpeedFactor = Math.max(0.02, Math.min(speedFactor, 200)); // Lower min clamp for even slower possibility
        // Duration calculation: Using '30 / clampedSpeedFactor' to give longer base duration
        // Min duration 5s, Max 80s. Very slow flows can be very long.
        s1_dashdrawDuration = `${Math.max(5, Math.min(80, 30 / clampedSpeedFactor))}s`; 
      } else {
        // If speed factor is negligible, make it a very slow, long animation or turn off
        // s1_isDashdrawCandidate = false; // Option 1: Turn off animation if too slow
        s1_dashdrawDuration = '80s';    // Option 2: Make it extremely slow
      }
    }
  } else if (currentAnimationType === 'constant_unidirectional') {
    s1_dashdrawDirection = animConfig?.constantFlowDirection === 'reverse' ? 'reverse' : 'normal';
    const speedSetting = animConfig?.constantFlowSpeed;
    if (speedSetting === 'slow') s1_dashdrawDuration = '4s';
    else if (speedSetting === 'medium') s1_dashdrawDuration = '2s';
    else if (speedSetting === 'fast') s1_dashdrawDuration = '1s';
    else if (typeof speedSetting === 'number' && speedSetting > 0) {
      s1_dashdrawDuration = `${Math.max(0.2, Math.min(15, speedSetting))}s`;
    } else {
      s1_dashdrawDuration = '2s'; // Default for constant
    }

    if (animConfig?.constantFlowActivationDataPointId) {
      const rawActivationValue = getDataPointValue(animConfig.constantFlowActivationDataPointId, dataPoints, opcUaNodeValues);
      s1_isConceptuallyActive = !!rawActivationValue;
    } else {
      s1_isConceptuallyActive = true;
    }
    s1_isDashdrawCandidate = s1_isConceptuallyActive;
  } else { // 'none' or fallback animation logic
    const isEnergizedLink = data?.dataPointLinks?.find(l => l.targetProperty === 'isEnergized');
    if (isEnergizedLink) {
        const rawIsEnergized = getDataPointValue(isEnergizedLink.dataPointId, dataPoints, opcUaNodeValues);
        s1_isConceptuallyActive = !!(isEnergizedLink.valueMapping ? applyValueMapping(rawIsEnergized, isEnergizedLink) : rawIsEnergized);
    } else {
        s1_isConceptuallyActive = data?.isEnergized ?? false; 
    }
    s1_isDashdrawCandidate = s1_isConceptuallyActive;
    s1_dashdrawDuration = '5s'; // Uses your default 5s
    s1_dashdrawDirection = 'normal';
  }

  // --- Stage 2: Base color and width for solid path (logic remains similar) ---
  let s2_solidPathStrokeColor = flowColors.OFFLINE;
  let strokeWidthKey: keyof typeof flowTypeStrokeWidths = 'DEFAULT';
  if (data?.flowType === 'AC' || data?.flowType === 'DC') {
    const vl = data.voltageLevel || 'LV';
    strokeWidthKey = `${data.flowType}_${vl}` as keyof typeof flowTypeStrokeWidths;
  } else if (data?.flowType === 'CONTROL_SIGNAL') strokeWidthKey = 'CONTROL_SIGNAL';
  else if (data?.flowType === 'DATA_BUS') strokeWidthKey = 'DATA_BUS';
  else if (data?.flowType === 'AUX_POWER') strokeWidthKey = 'AUX_POWER';
  let s2_solidPathStrokeWidth = flowTypeStrokeWidths[strokeWidthKey] || flowTypeStrokeWidths.DEFAULT;

  if (s1_isConceptuallyActive) {
    const flowType = data?.flowType;
    if (flowType) {
        if (flowType === 'AC' || flowType === 'DC') {
            const ftk = `${flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors;
            s2_solidPathStrokeColor = (flowColors as any)[ftk] || flowColors.ENERGIZED_DEFAULT;
        } else { // For CONTROL_SIGNAL, DATA_BUS, AUX_POWER etc.
            s2_solidPathStrokeColor = (flowColors as any)[flowType as any] || flowColors.ENERGIZED_DEFAULT;
        }
    } else { // Generic energized
        s2_solidPathStrokeColor = flowColors.ENERGIZED_DEFAULT;
    }
  } else { // Not conceptually active
    // Show static color if type is defined, otherwise OFFLINE
    if (data?.flowType === 'CONTROL_SIGNAL') s2_solidPathStrokeColor = flowColors.CONTROL_SIGNAL;
    else if (data?.flowType === 'DATA_BUS') s2_solidPathStrokeColor = flowColors.DATA_BUS;
    else if (data?.flowType === 'AUX_POWER') s2_solidPathStrokeColor = flowColors.AUX_POWER;
    else s2_solidPathStrokeColor = flowColors.OFFLINE;
  }

  // --- Stage 3: Status Overrides (logic remains similar) ---
  let s3_currentSolidPathStrokeColor = s2_solidPathStrokeColor;
  let s3_isDashdrawActive = s1_isDashdrawCandidate;
  let s3_solidPathPulseType: 'faultPulse' | 'subtlePulse' | 'none' = 'none';
  let s3_solidPathPulseDuration = '';

  const statusLink = data?.dataPointLinks?.find(link => link.targetProperty === 'status');
  let statusValueFromLink: string | null = null;
  if (statusLink) {
    const rawStatus = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues);
    statusValueFromLink = String(statusLink.valueMapping ? applyValueMapping(rawStatus, statusLink) : rawStatus).toUpperCase();
  }
  const finalStatus: string = statusValueFromLink || String(data?.status || '').toUpperCase();

  if (finalStatus === 'FAULT') {
    s3_currentSolidPathStrokeColor = flowColors.FAULT;
    s3_isDashdrawActive = false;
    s3_solidPathPulseType = 'faultPulse';
    s3_solidPathPulseDuration = '0.8s';
  } else if (finalStatus === 'WARNING') {
    if (s3_currentSolidPathStrokeColor !== flowColors.FAULT) {
        s3_currentSolidPathStrokeColor = flowColors.WARNING;
    }
    if (!s3_isDashdrawActive && s3_solidPathPulseType === 'none') { 
      s3_solidPathPulseType = 'subtlePulse';
      s3_solidPathPulseDuration = '1.5s';
    }
  }
  
  if (s3_isDashdrawActive && !s1_isConceptuallyActive) {
    s3_isDashdrawActive = false;
  }

  // --- Stage 4: Selection Styling & Final Animated Dash Color (logic remains similar) ---
  let s4_finalSolidPathStrokeColor = s3_currentSolidPathStrokeColor;
  let s4_finalSolidPathStrokeWidth = s2_solidPathStrokeWidth;
  let s4_animatedDashColor: string;

  if (selected) {
    s4_finalSolidPathStrokeColor = flowColors.SELECTED_STROKE;
    s4_finalSolidPathStrokeWidth = s2_solidPathStrokeWidth + SELECTED_STROKE_WIDTH_INCREASE;
    s4_animatedDashColor = 'var(--edge-animated-dash-on-selected)';

    if (!s3_isDashdrawActive && s3_solidPathPulseType === 'none' && s1_isConceptuallyActive) {
      s3_solidPathPulseType = 'subtlePulse';
      s3_solidPathPulseDuration = '1.8s';
    }
  } else {
    if (s3_currentSolidPathStrokeColor === flowColors.WARNING) {
      s4_animatedDashColor = 'var(--edge-animated-dash-on-warning)';
    } else {
      s4_animatedDashColor = 'var(--edge-animated-dash-default)';
    }
  }

  // --- Assemble Styles for SVG Paths ---
  const solidPathStyle: React.CSSProperties = {
    stroke: s4_finalSolidPathStrokeColor,
    strokeWidth: s4_finalSolidPathStrokeWidth,
    strokeLinecap: 'round',
    transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out',
    ...(style || {}),
  };

  if (s3_solidPathPulseType !== 'none') {
    solidPathStyle.animationName = s3_solidPathPulseType;
    solidPathStyle.animationDuration = s3_solidPathPulseDuration;
    solidPathStyle.animationIterationCount = 'infinite';
    solidPathStyle.animationTimingFunction = 'ease-in-out';
  }

  // Animated path properties for smoother flow
  // Key change: `linecap: 'round'` for all animated patterns.
  const animatedPathDashArrayConfig = {
    DEFAULT:        { array: '10 6', sum: 16, linecap: 'round' as const },
    DATA_BUS:       { array: '2 7', sum: 9, linecap: 'round' as const }, // Shorter "dots" for data
    CONTROL_SIGNAL: { array: '6 6', sum: 12, linecap: 'round' as const },
  };
  
  let currentDashConfig = animatedPathDashArrayConfig.DEFAULT;
  if (data?.flowType === 'DATA_BUS') currentDashConfig = animatedPathDashArrayConfig.DATA_BUS;
  else if (data?.flowType === 'CONTROL_SIGNAL') currentDashConfig = animatedPathDashArrayConfig.CONTROL_SIGNAL;

  // Use the AnimatedPathStyle interface here for type safety with the CSS custom property
  const animatedPathStyle: AnimatedPathStyle = {
    stroke: s4_animatedDashColor,
    strokeWidth: Math.max(MIN_ANIMATED_DASH_WIDTH, s4_finalSolidPathStrokeWidth * ANIMATED_DASH_WIDTH_FACTOR),
    strokeLinecap: currentDashConfig.linecap, // Apply round caps here
    fill: 'none',
    pointerEvents: 'none',
  };

  if (s3_isDashdrawActive) {
    animatedPathStyle.strokeDasharray = currentDashConfig.array;
    // Set the CSS custom property for the animation offset
    animatedPathStyle['--edge-animation-dashoffset-end'] = `-${currentDashConfig.sum}px`;
    animatedPathStyle.animationName = 'dashdraw';
    animatedPathStyle.animationDuration = s1_dashdrawDuration;
    animatedPathStyle.animationDirection = s1_dashdrawDirection;
    animatedPathStyle.animationIterationCount = 'infinite';
    animatedPathStyle.animationTimingFunction = 'linear'; // Linear is best for continuous flow
  }
  
  // --- Edge Label Styling (logic remains similar) ---
  const labelBorderColor = selected
    ? flowColors.SELECTED_STROKE
    : (s1_isConceptuallyActive || finalStatus === 'FAULT' || finalStatus === 'WARNING')
      ? s4_finalSolidPathStrokeColor
      : 'var(--edge-label-border-inactive)';
  
  const labelBackground = (s4_finalSolidPathStrokeColor === flowColors.OFFLINE && !s1_isConceptuallyActive)
    ? 'var(--edge-label-bg-inactive)'
    : 'var(--edge-label-bg)';

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={solidPathStyle}
      />
      {s3_isDashdrawActive && (
        <path
          d={edgePath}
          style={animatedPathStyle} // This style object now correctly typed
          className="react-flow__edge-path-animated-foreground"
        />
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: labelBackground,
              color: 'var(--edge-label-text)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 500,
              boxShadow: '0 2px 5px var(--edge-label-shadow-color)',
              pointerEvents: 'all',
              opacity: selected || s1_isConceptuallyActive || finalStatus !== '' ? 1 : 0.8,
              transition: 'opacity 0.25s ease, border-color 0.25s ease, background-color 0.25s ease',
              border: `1.5px solid ${labelBorderColor}`,
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