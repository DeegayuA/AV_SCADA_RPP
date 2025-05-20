// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils'; // Ensure nodeUtils path is correct
import { CustomFlowEdgeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';

// Centralized styling for consistency
const flowColors = {
  AC_HV: '#FFBF00',      // Bright Yellow-Orange
  AC_MV: '#FFA500',      // Orange
  AC_LV: '#FF8C00',      // DarkOrange (was Tomato, more distinct from fault)
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


export default function AnimatedFlowEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, data, selected,
}: EdgeProps<CustomFlowEdgeData & { status?: string }>) { // Allow optional status prop if needed directly, though usually in data
  
  const realtimeData = useAppStore((state) => state.realtimeData);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  // --- Initialize values ---
  let edgeStrokeColor = data?.isEnergized === false ? flowColors.OFFLINE : flowColors.ENERGIZED_DEFAULT; // Default to energized unless explicitly offline
  if (data?.isEnergized === undefined && (!data?.dataPointLinks || data.dataPointLinks.length === 0)) { // if undefined and no DP links default to offline if not animated later
    edgeStrokeColor = flowColors.OFFLINE;
  }

  let edgeStrokeWidth = voltageStrokeWidths[(data?.voltageLevel as keyof typeof voltageStrokeWidths) || 'DEFAULT'] || voltageStrokeWidths.DEFAULT;
  let animationName = 'none';
  let animationDirection = 'normal';
  let animationDuration = '20s'; // Default moderately slow speed
  const baseStrokeDasharray = '10 4'; // Default dash pattern, slightly more spacing

  // --- Apply static data props ---
  if (data?.flowType) { // isEnergized state will be handled by DPLinks or default if no DPLinks
    const flowTypeKey = `${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors;
    if (flowColors[flowTypeKey]) {
      edgeStrokeColor = flowColors[flowTypeKey];
    } else if (data.flowType === 'CONTROL_SIGNAL') {
      edgeStrokeColor = flowColors.CONTROL_SIGNAL;
    } else if (data.flowType === 'AUX_POWER') {
      edgeStrokeColor = flowColors.AUX_POWER;
    }
  }

  // Use static status if provided and no DPLink for status
  if (data?.status === 'FAULT' && !(data?.dataPointLinks?.find(l => l.targetProperty === 'status'))) {
    edgeStrokeColor = flowColors.FAULT;
  } else if (data?.status === 'WARNING' && !(data?.dataPointLinks?.find(l => l.targetProperty === 'status'))) {
    edgeStrokeColor = flowColors.WARNING;
  }

  // --- Realtime Data Overrides & Animation Control ---
  let flowActive = data?.isEnergized ?? (data?.dataPointLinks?.some(l => ['flowDirection','isEnergized'].includes(l.targetProperty)) ? false : true) ; // Assume energized if isEnergized undefined AND no specific DPLinks exist for it, otherwise default to false if DPLinked

  // Status Link (Faults, Warnings, Energized state) - highest priority for color and some animation
  const statusLink = data?.dataPointLinks?.find(link => ['status', 'isEnergized'].includes(link.targetProperty));
  if (statusLink) {
    const rawStatusValue = getDataPointValue(statusLink.dataPointId, realtimeData);
    const mappedStatusValue = statusLink.valueMapping ? applyValueMapping(rawStatusValue, statusLink) : rawStatusValue;
    
    if (statusLink.targetProperty === 'isEnergized') {
      flowActive = !!mappedStatusValue; // True if truthy, false if falsy/undefined/null
      if (!flowActive && edgeStrokeColor !== flowColors.FAULT && edgeStrokeColor !== flowColors.WARNING) { // Don't override fault/warning colors if going offline
          edgeStrokeColor = flowColors.OFFLINE;
      } else if (flowActive && edgeStrokeColor === flowColors.OFFLINE) { // If energized and was previously offline due to no static flowType
          edgeStrokeColor = data?.flowType ? (flowColors[`${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors] || flowColors.ENERGIZED_DEFAULT) : flowColors.ENERGIZED_DEFAULT;
      }
    } else if (statusLink.targetProperty === 'status') {
        if (String(mappedStatusValue).toUpperCase() === 'FAULT') {
            edgeStrokeColor = flowColors.FAULT;
            animationName = 'faultPulse'; animationDuration = '1s';
            flowActive = true; // Faults are considered active/visible
        } else if (String(mappedStatusValue).toUpperCase() === 'WARNING') {
            edgeStrokeColor = flowColors.WARNING; // Color for warning, animation might be default flow or subtle pulse
            // flowActive = true; // Warnings are also active
        } else if (String(mappedStatusValue).toUpperCase() === 'OFFLINE') {
            if (edgeStrokeColor !== flowColors.FAULT && edgeStrokeColor !== flowColors.WARNING) edgeStrokeColor = flowColors.OFFLINE;
            flowActive = false;
        } else if (String(mappedStatusValue).toUpperCase() === 'ENERGIZED' || String(mappedStatusValue).toUpperCase() === 'NOMINAL') {
             if (edgeStrokeColor === flowColors.OFFLINE) { // If energized and was previously offline due to no static flowType
                 edgeStrokeColor = data?.flowType ? (flowColors[`${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors] || flowColors.ENERGIZED_DEFAULT) : flowColors.ENERGIZED_DEFAULT;
             }
            flowActive = true;
        }
    }
  }
  
  // Flow Direction Link (overrides static if present, but not if faultPulse is active)
  const flowLink = data?.dataPointLinks?.find(link => link.targetProperty === 'flowDirection');
  if (flowLink && animationName !== 'faultPulse') {
    const rawFlowValue = getDataPointValue(flowLink.dataPointId, realtimeData);
    // Note: applyValueMapping needs to handle numeric passthrough if mapping not matched
    const mappedFlowState = flowLink.valueMapping ? applyValueMapping(rawFlowValue, flowLink) : rawFlowValue;

    if (mappedFlowState === 'forward' || (typeof mappedFlowState === 'number' && mappedFlowState > 0)) {
      animationDirection = 'normal';
      flowActive = true; 
    } else if (mappedFlowState === 'reverse' || (typeof mappedFlowState === 'number' && mappedFlowState < 0)) {
      animationDirection = 'reverse';
      flowActive = true;
    } else { // 'none', 0, or unmapped states that don't translate to forward/reverse
      if (flowActive) { // Only change to not flowing if it was previously active based on energy status
         // Keep flowActive as is from status link, just don't animate direction if 'none'
      }
    }
    if (flowActive && (mappedFlowState === 'forward' || mappedFlowState === 'reverse' || (typeof mappedFlowState === 'number' && mappedFlowState !== 0 ))) {
        animationName = 'dashdraw';
    } else {
        animationName = 'none';
    }
  } else if (flowActive && animationName !== 'faultPulse') { // if flowActive from status, but no specific flowLink
    animationName = 'dashdraw'; // Default animation for active flow
  }


  // Animation Speed Link (modulates 'dashdraw' or 'faultPulse' if needed)
  let currentSpeedFactor = typeof data?.currentLoad === 'number' ? data.currentLoad / 100 : 0; // 0-1 if currentLoad is %
  const speedLink = data?.dataPointLinks?.find(link => ['animationSpeedFactor', 'currentLoadPercent'].includes(link.targetProperty));
  if (speedLink) {
    const rawSpeedValue = getDataPointValue(speedLink.dataPointId, realtimeData);
    const mappedSpeed = speedLink.valueMapping ? applyValueMapping(rawSpeedValue, speedLink) : rawSpeedValue;
    if (typeof mappedSpeed === 'number' && mappedSpeed > 0) {
      // If animationSpeedFactor, it's a multiplier. If currentLoadPercent, it's 0-100.
      currentSpeedFactor = speedLink.targetProperty === 'animationSpeedFactor' ? mappedSpeed : Math.max(0, Math.min(mappedSpeed / 100, 2)); // Clamp load % contribution
    }
  }

  if (animationName === 'dashdraw' || animationName === 'faultPulse') { // Affects both normal and fault animation speed
    const baseDuration = animationName === 'faultPulse' ? 1 : 20; // Faults faster base
    // Higher speedFactor = shorter duration (faster animation). Factor of 1 results in baseDuration / (1+1*3) = baseDuration/4.
    // Factor 0 gives baseDuration. Max factor (e.g. 2 for 200%) would be baseDuration / (1+2*3) = baseDuration/7
    // Clamped to avoid excessively fast/slow.
    const effectiveSpeedFactor = Math.max(0, Math.min(currentSpeedFactor, 5)); // Clamp speed factor influence
    animationDuration = `${Math.max(0.5, Math.min(60, baseDuration / (1 + effectiveSpeedFactor * 2)))}s`;
  }
  
  // Ensure if not flowActive and not fault, animation is 'none'
  if (!flowActive && animationName !== 'faultPulse') {
    animationName = 'none';
  }


  // --- Selected State Styling ---
  if (selected) {
    edgeStrokeColor = flowColors.SELECTED_STROKE;
    edgeStrokeWidth += SELECTED_STROKE_WIDTH_INCREASE;
    // If selected and would normally animate, keep its animation. If not, add subtle pulse.
    if (animationName === 'none' && (flowActive || data?.isEnergized)) {
        animationName = 'subtlePulse';
        animationDuration = '2s';
    }
  }

  // Final assembled style
  const finalStyle: React.CSSProperties = {
    ...style, // Base styles from ReactFlow props
    stroke: edgeStrokeColor,
    strokeWidth: edgeStrokeWidth,
  };

  // Apply animation-related CSS properties only if an animation is active
  if (animationName !== 'none') {
    finalStyle.strokeDasharray = baseStrokeDasharray;
    finalStyle.animationName = animationName;
    finalStyle.animationDuration = animationDuration;
    finalStyle.animationDirection = animationDirection;
    finalStyle.animationIterationCount = 'infinite';
    finalStyle.animationTimingFunction = 'linear';
  }
  
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={finalStyle} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--background, var(--bg-background, #ffffff))', // Use theme-aware CSS vars
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
