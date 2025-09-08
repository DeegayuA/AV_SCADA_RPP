// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, EdgeLabelRenderer } from 'reactflow';
import { getSmoothStepPath } from '@xyflow/react';
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils';
import {
    CustomFlowEdgeData,
    AnimationFlowConfig,
    GlobalSLDAnimationSettings,
    DynamicFlowType // Import the new type
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

  let s1_isConceptuallyActive = false;
  let s1_isDashdrawCandidate = false;
  let s1_dashdrawDirection: 'normal' | 'reverse' = 'normal';
  let s1_dashdrawDuration = '5s';

  const typedAnimConfig = data?.animationSettings as (AnimationFlowConfig & Partial<GlobalSLDAnimationSettings>) | undefined;
  const masterGlobalInvertActive = typedAnimConfig?.globallyInvertDefaultDynamicFlowLogic ?? false;
  const currentAnimationType = typedAnimConfig?.animationType || 'none';

  if (currentAnimationType === 'dynamic_power_flow') {
    s1_isConceptuallyActive = true; // Dynamic flow implies it's conceptually active if configured
    let flowMagnitude = 0;
    let baseDirectionDetermination: 'normal' | 'reverse' = 'normal'; // Used for bidirectional
    let applyMasterInvert = false;

    const dynamicFlowTypeResolved: DynamicFlowType = typedAnimConfig?.dynamicFlowType ?? 'bidirectional_from_net'; // Fallback

    switch (dynamicFlowTypeResolved) {
      case 'bidirectional_gen_vs_usage':
        if (typedAnimConfig?.generationDataPointId && typedAnimConfig?.usageDataPointId) {
          const rawGen = getDataPointValue(typedAnimConfig.generationDataPointId, dataPoints, opcUaNodeValues);
          const rawUsage = getDataPointValue(typedAnimConfig.usageDataPointId, dataPoints, opcUaNodeValues);
          const gen = typeof rawGen === 'number' && !isNaN(rawGen) ? rawGen : 0;
          const usage = typeof rawUsage === 'number' && !isNaN(rawUsage) ? rawUsage : 0;
          const netFlow = gen - usage;
          flowMagnitude = Math.abs(netFlow);
          s1_isDashdrawCandidate = netFlow !== 0;
          if (netFlow > 0) baseDirectionDetermination = 'reverse'; // Export T->S
          else if (netFlow < 0) baseDirectionDetermination = 'normal'; // Import S->T
          applyMasterInvert = true;
        }
        break;

      case 'bidirectional_from_net':
        if (typedAnimConfig?.gridNetFlowDataPointId) {
          const rawNet = getDataPointValue(typedAnimConfig.gridNetFlowDataPointId, dataPoints, opcUaNodeValues);
          const netFlow = typeof rawNet === 'number' && !isNaN(rawNet) ? rawNet : 0;
          flowMagnitude = Math.abs(netFlow);
          s1_isDashdrawCandidate = netFlow !== 0;
          if (netFlow > 0) baseDirectionDetermination = 'reverse'; // Export T->S
          else if (netFlow < 0) baseDirectionDetermination = 'normal'; // Import S->T
          applyMasterInvert = true;
        }
        break;

      case 'unidirectional_export':
        if (typedAnimConfig?.dynamicMagnitudeDataPointId) {
          const rawMag = getDataPointValue(typedAnimConfig.dynamicMagnitudeDataPointId, dataPoints, opcUaNodeValues);
          flowMagnitude = typeof rawMag === 'number' && !isNaN(rawMag) ? Math.abs(rawMag) : 0; // Ensure positive magnitude
          s1_isDashdrawCandidate = flowMagnitude > 0.001; // Activate if magnitude is significant
          baseDirectionDetermination = 'reverse'; // Default export direction: Target -> Source
          applyMasterInvert = false; // Master invert does not apply to fixed direction types
        }
        break;
        
      case 'unidirectional_import':
        if (typedAnimConfig?.dynamicMagnitudeDataPointId) {
          const rawMag = getDataPointValue(typedAnimConfig.dynamicMagnitudeDataPointId, dataPoints, opcUaNodeValues);
          flowMagnitude = typeof rawMag === 'number' && !isNaN(rawMag) ? Math.abs(rawMag) : 0; // Ensure positive magnitude
          s1_isDashdrawCandidate = flowMagnitude > 0.001;
          baseDirectionDetermination = 'normal'; // Default import direction: Source -> Target
          applyMasterInvert = false; // Master invert does not apply to fixed direction types
        }
        break;
      
      default: // Fallback, treat as bidirectional_from_net or none
        s1_isDashdrawCandidate = false;
    }

    // Determine final direction
    let directionAfterGlobalInvert = baseDirectionDetermination;
    if (applyMasterInvert && masterGlobalInvertActive && s1_isDashdrawCandidate) {
        directionAfterGlobalInvert = (baseDirectionDetermination === 'normal') ? 'reverse' : 'normal';
    }
    
    s1_dashdrawDirection = directionAfterGlobalInvert;
    if (typedAnimConfig?.invertFlowDirection && s1_isDashdrawCandidate) {
        s1_dashdrawDirection = (directionAfterGlobalInvert === 'normal') ? 'reverse' : 'normal';
    }

    // Calculate duration (common for all dynamic types if candidate)
    if (s1_isDashdrawCandidate) {
      const safeSpeedMultiplier = Math.max(0.1, typedAnimConfig?.speedMultiplier ?? 10);
      const BASE_SPEED_ADJUSTMENT_FACTOR = 5;
      const speedFactor = flowMagnitude * safeSpeedMultiplier * BASE_SPEED_ADJUSTMENT_FACTOR;

      const minDuration = typedAnimConfig?.minDynamicDuration ?? 0.5;
      const maxDuration = typedAnimConfig?.maxDynamicDuration ?? 60;
      const baseDivisor = typedAnimConfig?.dynamicSpeedBaseDivisor ?? 30;

      if (speedFactor > 0.001) {
        const clampedSpeedFactor = Math.max(0.02, Math.min(speedFactor, 200));
        s1_dashdrawDuration = `${Math.max(minDuration, Math.min(maxDuration, baseDivisor / clampedSpeedFactor)).toFixed(2)}s`;
      } else {
        s1_dashdrawDuration = `${maxDuration.toFixed(2)}s`; // Use max duration for negligible flow
      }
    }
  } else if (currentAnimationType === 'constant_unidirectional') {
    // ... (constant_unidirectional logic remains the same)
    s1_dashdrawDirection = typedAnimConfig?.constantFlowDirection === 'reverse' ? 'reverse' : 'normal';
    const speedSetting = typedAnimConfig?.constantFlowSpeed;

    if (speedSetting === 'slow') s1_dashdrawDuration = '4s';
    else if (speedSetting === 'medium') s1_dashdrawDuration = '2s';
    else if (speedSetting === 'fast') s1_dashdrawDuration = '1s';
    else if (typeof speedSetting === 'number' && speedSetting > 0) {
      const minCD = typedAnimConfig?.minConstantDuration ?? 0.2;
      const maxCD = typedAnimConfig?.maxConstantDuration ?? 15;
      s1_dashdrawDuration = `${Math.max(minCD, Math.min(maxCD, speedSetting)).toFixed(2)}s`;
    } else {
      s1_dashdrawDuration = '2s'; 
    }

    if (typedAnimConfig?.constantFlowActivationDataPointId) {
      const rawActivationValue = getDataPointValue(typedAnimConfig.constantFlowActivationDataPointId, dataPoints, opcUaNodeValues);
      s1_isConceptuallyActive = !!rawActivationValue;
    } else {
      s1_isConceptuallyActive = true;
    }
    s1_isDashdrawCandidate = s1_isConceptuallyActive;

  } else { // 'none' or fallback
    const isEnergizedLink = data?.dataPointLinks?.find(l => l.targetProperty === 'isEnergized');
    if (isEnergizedLink) {
        const rawIsEnergized = getDataPointValue(isEnergizedLink.dataPointId, dataPoints, opcUaNodeValues);
        s1_isConceptuallyActive = !!(isEnergizedLink.valueMapping ? applyValueMapping(rawIsEnergized, isEnergizedLink) : rawIsEnergized);
    } else {
        s1_isConceptuallyActive = data?.isEnergized ?? false; 
    }
    s1_isDashdrawCandidate = s1_isConceptuallyActive;
    s1_dashdrawDuration = '5s';
    s1_dashdrawDirection = 'normal';
  }

  // Stages 2, 3, 4, and SVG rendering logic remain largely the same.
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
  
  if (s3_isDashdrawActive && !s1_isConceptuallyActive && currentAnimationType !== 'dynamic_power_flow') { // dynamic_power_flow sets its own s1_isConceptuallyActive
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

    // Keep pulse on select if conceptually active (true for dynamic flow unless not animating)
    const canPulseOnSelect = s1_isConceptuallyActive || (currentAnimationType === 'dynamic_power_flow' && s1_isDashdrawCandidate);
    if (!s3_isDashdrawActive && s3_solidPathPulseType === 'none' && canPulseOnSelect) {
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
  
  const animatedPathDashArrayConfig = {
    DEFAULT:        { array: '10 6', sum: 16, linecap: 'round' as const },
    DATA_BUS:       { array: '2 7', sum: 9, linecap: 'round' as const },
    CONTROL_SIGNAL: { array: '6 6', sum: 12, linecap: 'round' as const },
  };
  
  let currentDashConfig = animatedPathDashArrayConfig.DEFAULT;
  if (data?.flowType === 'DATA_BUS') currentDashConfig = animatedPathDashArrayConfig.DATA_BUS;
  else if (data?.flowType === 'CONTROL_SIGNAL') currentDashConfig = animatedPathDashArrayConfig.CONTROL_SIGNAL;

  const animatedPathStyle: AnimatedPathStyle = {
    stroke: s4_animatedDashColor,
    strokeWidth: Math.max(MIN_ANIMATED_DASH_WIDTH, s4_finalSolidPathStrokeWidth * ANIMATED_DASH_WIDTH_FACTOR),
    strokeLinecap: currentDashConfig.linecap,
    fill: 'none',
    pointerEvents: 'none',
  };

  if (s3_isDashdrawActive) {
    animatedPathStyle.strokeDasharray = currentDashConfig.array;
    animatedPathStyle['--edge-animation-dashoffset-end'] = `-${currentDashConfig.sum}px`;
    animatedPathStyle.animationName = 'dashdraw';
    animatedPathStyle.animationDuration = s1_dashdrawDuration;
    animatedPathStyle.animationDirection = s1_dashdrawDirection;
    animatedPathStyle.animationIterationCount = 'infinite';
    animatedPathStyle.animationTimingFunction = 'linear';
  }
  
  const isActuallyActiveForLabel = s1_isConceptuallyActive || (currentAnimationType === 'dynamic_power_flow' && s1_isDashdrawCandidate);

  const labelBorderColor = selected
      ? flowColors.SELECTED_STROKE
      : (isActuallyActiveForLabel || finalStatus === 'FAULT' || finalStatus === 'WARNING')
      ? s4_finalSolidPathStrokeColor
      : 'var(--edge-label-border-inactive)';

  const labelBackground = (s4_finalSolidPathStrokeColor === flowColors.OFFLINE && !isActuallyActiveForLabel)
      ? 'var(--edge-label-bg-inactive)'
      : 'var(--edge-label-bg)';

  // --- Label Rendering Logic ---
  // Extract label text from data. If CustomFlowEdgeData defines label as `label?: string;`
  // then labelText will be a string, undefined, or null.
  const labelText = data?.label;

  // Determine if the label should be shown:
  // - labelText must be a string.
  // - After trimming whitespace, it must not be an empty string.
  const showLabel = typeof labelText === 'string' && labelText.trim() !== '';

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
          style={animatedPathStyle}
          className="react-flow__edge-path-animated-foreground"
        />
      )}
      {/* Conditionally render the label */}
      {showLabel && (
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
              opacity: selected || isActuallyActiveForLabel || finalStatus !== '' ? 1 : 0.8,
              transition: 'opacity 0.25s ease, border-color 0.25s ease, background-color 0.25s ease',
              border: `1.5px solid ${labelBorderColor}`,
            }}
            className="nodrag nopan react-flow__edge-label"
          >
            {labelText} {/* Render the original labelText */}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}