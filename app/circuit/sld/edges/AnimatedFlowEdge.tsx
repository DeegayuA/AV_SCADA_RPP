// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { getDataPointValue, applyValueMapping } from '../nodes/nodeUtils';
import { CustomFlowEdgeData, DataPointLink } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';

// Define these constants here or import from a shared config
const flowColors = {
  AC_HV: '#FFBF00',         // Bright Yellow-Orange for High Voltage AC
  AC_MV: '#FFA500',         // Orange for Medium Voltage AC
  AC_LV: '#FF6347',         // Tomato Red for Low Voltage AC
  DC_HV: '#1E90FF',         // DodgerBlue for High Voltage DC
  DC_MV: '#00BFFF',         // DeepSkyBlue for Medium Voltage DC
  DC_LV: '#87CEFA',         // LightSkyBlue for Low Voltage DC
  CONTROL_SIGNAL: '#32CD32',// LimeGreen for control signals
  AUX_POWER: '#DA70D6',     // Orchid for auxiliary power
  ENERGIZED_DEFAULT: '#7CFC00',// LawnGreen (generic energized, if types above don't match)
  OFFLINE: '#A9A9A9',       // DarkGray for offline or de-energized lines
  FAULT: '#FF0000',         // Bright Red for faults (highest priority)
  WARNING: '#FFD700',       // Yellow for warnings
  SELECTED_STROKE: '#007bff', // A distinct blue for selected edges
};

const voltageStrokeWidths = {
  HV: 4.5,
  MV: 3.5,
  LV: 2.5,
  ELV: 2, // For control/auxiliary/signals
  DEFAULT: 2.5,
};
const SELECTED_STROKE_WIDTH_INCREASE = 1.5; // How much to increase strokeWidth when selected


export default function AnimatedFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {}, // Base style from ReactFlow or parent
  markerEnd,
  data,       // CustomFlowEdgeData
  selected,
}: EdgeProps<CustomFlowEdgeData & { status?: string }>) {
  const realtimeData = useAppStore((state) => state.realtimeData);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  // --- Initialize values ---
  let edgeStrokeColor = data?.isEnergized ? flowColors.ENERGIZED_DEFAULT : flowColors.OFFLINE;
  let edgeStrokeWidth = voltageStrokeWidths[data?.voltageLevel || 'DEFAULT'] || voltageStrokeWidths.DEFAULT;
  let animationName = 'none';
  let animationDirection = 'normal';
  let animationDuration = '20s'; // Default moderately slow speed
  const strokeDasharray = '10 2'; // Visible dashes for animation "track"

  // --- Base styling from static data props ---
  if (data?.flowType && data.isEnergized) {
    const key = `${data.flowType}_${data.voltageLevel || 'LV'}` as keyof typeof flowColors; // e.g. AC_HV, DC_LV
    if (flowColors[key]) {
      edgeStrokeColor = flowColors[key];
    } else if (data.flowType === 'CONTROL_SIGNAL') {
      edgeStrokeColor = flowColors.CONTROL_SIGNAL;
    }
  }
  if (data?.status === 'FAULT') edgeStrokeColor = flowColors.FAULT;
  else if (data?.status === 'WARNING') edgeStrokeColor = flowColors.WARNING;


  // --- Realtime Data Overrides & Animation Control ---
  const flowLink = data?.dataPointLinks?.find(link => link.targetProperty === 'flowDirection' || link.targetProperty === 'flowStatus');
  const speedLink = data?.dataPointLinks?.find(link => link.targetProperty === 'animationSpeedFactor' || link.targetProperty === 'currentLoadPercent'); // For dynamic speed
  const statusLink = data?.dataPointLinks?.find(link => link.targetProperty === 'status'); // For realtime fault/warning

  let flowActive = data?.isEnergized ?? false; // Assume energized if static flag is true

  if (statusLink) {
    const statusValue = getDataPointValue(statusLink.dataPointId, realtimeData);
    const mappedStatus = statusLink.valueMapping ? applyValueMapping(statusValue, statusLink) : statusValue;
    if (mappedStatus === 'FAULT' || statusValue === 'FAULT') { // Check mapped and raw
      edgeStrokeColor = flowColors.FAULT;
      animationName = 'faultPulse'; // Use a distinct fault animation
      animationDuration = '1s';     // Faster, more urgent pulse for faults
      flowActive = true; // Faults should animate
    } else if (mappedStatus === 'WARNING' || statusValue === 'WARNING') {
      edgeStrokeColor = flowColors.WARNING;
      // Potentially a different animation for warning, or just color
    } else if (mappedStatus === 'OFFLINE' || statusValue === 'OFFLINE'){
        edgeStrokeColor = flowColors.OFFLINE;
        flowActive = false;
    } else if (mappedStatus === 'ENERGIZED' || statusValue === 'ENERGIZED') {
        flowActive = true; // Explicitly energized by data point
        // Color might already be set by flowType, or use ENERGIZED_DEFAULT if needed
        if (edgeStrokeColor === flowColors.OFFLINE) edgeStrokeColor = flowColors.ENERGIZED_DEFAULT;
    }
  }


  if (flowLink && animationName !== 'faultPulse') { // Only if not already in fault animation
    const flowValue = getDataPointValue(flowLink.dataPointId, realtimeData);
    const mappedState = flowLink.valueMapping ? applyValueMapping(flowValue, flowLink) : undefined;

    if (mappedState === 'forward' || (!mappedState && typeof flowValue === 'number' && flowValue > 0) || mappedState === 'energized' || flowValue === 'energized') {
      animationDirection = 'normal';
      flowActive = true;
    } else if (mappedState === 'reverse' || (!mappedState && typeof flowValue === 'number' && flowValue < 0)) {
      animationDirection = 'reverse';
      flowActive = true;
    } else { // none, 0, or unmapped
      flowActive = false;
    }
  }

  if (flowActive && animationName !== 'faultPulse') {
    animationName = 'dashdraw'; // Default flow animation
  }
  if (!flowActive && animationName !== 'faultPulse') { // Ensure animation stops if no flow and not fault
    animationName = 'none';
  }


  // Animation speed modulation (higher load or speedFactor = faster animation)
  let speedFactor = data?.currentLoad ? (data.currentLoad / 100) : 0; // Assume currentLoad is 0-100% for this example

  if (speedLink) {
    const speedValue = getDataPointValue(speedLink.dataPointId, realtimeData);
    const mappedSpeedFactor = speedLink.valueMapping ? applyValueMapping(speedValue, speedLink) : speedValue;
    if (typeof mappedSpeedFactor === 'number' && mappedSpeedFactor > 0) {
      speedFactor = Math.max(speedFactor, mappedSpeedFactor); // Take the more impactful speed factor
    }
  }

  if (flowActive && animationName === 'dashdraw') { // Only adjust speed for normal flow
    if (speedFactor > 0) {
        const baseDuration = 20; // Base seconds for 0-1 speedFactor
        // Speed factor 0.1 -> ~18s, 0.5 -> 10s, 1 (100%) -> 5s, 2 (200%) -> 2.5s
        // Clamp to prevent excessively fast/slow animations
        animationDuration = `${Math.max(0.5, Math.min(30, baseDuration / (1 + speedFactor * 3)))}s`;
    }
  }


  // --- Selected State ---
  if (selected) {
    edgeStrokeColor = flowColors.SELECTED_STROKE;
    edgeStrokeWidth += SELECTED_STROKE_WIDTH_INCREASE;
    // If selected, always show some animation if it would normally be flowing, or make it a subtle pulse
    if (animationName === 'none' && data?.isEnergized) { // if statically energized but no flow
        animationName = 'subtlePulse'; // another animation for selected-idle
    }
  }


  const finalStyle: React.CSSProperties = {
    ...style, // User-defined base styles
    stroke: edgeStrokeColor,
    strokeWidth: edgeStrokeWidth,
    strokeDasharray: (animationName !== 'none') ? strokeDasharray : undefined, // Only apply dash if animating
    animationName: animationName,
    animationDuration: animationDuration,
    animationDirection: animationDirection,
    animationIterationCount: (animationName !== 'none') ? 'infinite' : undefined,
    animationTimingFunction: 'linear',
  };

  // Clean up ReactFlow animation props if no animation is active
  if (animationName === 'none') {
    delete finalStyle.strokeDasharray;
    delete finalStyle.animationName;
    delete finalStyle.animationDuration;
    delete finalStyle.animationDirection;
    delete finalStyle.animationIterationCount;
    delete finalStyle.animationTimingFunction;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={finalStyle}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--canvas-background, #ffffff)', // Use CSS vars for theming
              color: 'var(--text-color, #000000)',
              padding: '3px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              pointerEvents: 'all', // Important for label interaction if any
              opacity: selected ? 1 : 0.85, // Slightly fade if not selected
              transition: 'opacity 0.2s ease-in-out',
            }}
            className="nodrag nopan react-flow__edge-label" // Ensure ReactFlow ignores for drag/pan
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}