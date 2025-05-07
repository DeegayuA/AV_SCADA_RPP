// components/sld/edges/AnimatedFlowEdge.tsx
import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { getDerivedStyle, getDataPointValue, applyValueMapping } from '../nodes/nodeUtils'; // Use helpers
import { CustomFlowEdgeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';

// Ensure CSS keyframes are defined globally (see explanation above)

export default function AnimatedFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data, // CustomFlowEdgeData
  selected,
}: EdgeProps<CustomFlowEdgeData>) {
  const realtimeData = useAppStore((state) => state.realtimeData);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  // --- Animation Logic ---
  let flowStateResult: string | number | boolean | undefined | null = 'none'; // Default to no flow
  let animationDuration = '30s'; // Default speed

  const flowLink = data?.dataPointLinks?.find(link => link.targetProperty === 'flowDirection' || link.targetProperty === 'flowStatus');
  const speedLink = data?.dataPointLinks?.find(link => link.targetProperty === 'animationSpeed');

  if (flowLink) {
    const flowValue = getDataPointValue(flowLink.dataPointId, realtimeData);
    // Apply mapping ONLY if defined, otherwise use raw value interpretation
    const mappedState = flowLink.valueMapping ? applyValueMapping(flowValue, flowLink) : undefined;
    // Determine flow state: use mapped value if available AND valid, otherwise interpret raw value
    if (mappedState === 'forward' || mappedState === 'reverse' || mappedState === 'none') {
         flowStateResult = mappedState;
    } else if (flowValue > 0) { // Simple check for positive flow if no valid mapping
         flowStateResult = 'forward';
    } else if (flowValue < 0) { // Simple check for negative flow
         flowStateResult = 'reverse';
    } else {
         flowStateResult = 'none'; // Explicitly none if zero or undefined/null
    }
  }

   if (speedLink) {
     const speedValue = getDataPointValue(speedLink.dataPointId, realtimeData);
     const mappedSpeed = speedLink.valueMapping ? applyValueMapping(speedValue, speedLink) : speedValue;
     if (typeof mappedSpeed === 'string' && mappedSpeed.endsWith('s')) {
        animationDuration = mappedSpeed;
     } else if (typeof mappedSpeed === 'number' && mappedSpeed > 0) {
        // Adjust speed based on magnitude? Example: faster for higher power flow
        // This is just an example, tailor the logic as needed.
        const baseDuration = 30; // seconds for slowest speed (e.g., at value 1)
        animationDuration = `${Math.max(0.5, baseDuration / Math.abs(mappedSpeed))}s`; // Ensure minimum 0.5s duration
     }
   }
  // --- End Animation Logic ---

   // --- Style Logic ---
   const derivedStyle = getDerivedStyle(data ?? {}, realtimeData);
   const finalStyle: React.CSSProperties = {
       ...style,
       strokeDasharray: 5, // Explicitly set dash array for animation visibility
       strokeWidth: selected ? 3 : style?.strokeWidth ?? 2,
       stroke: selected ? '#3b82f6' : derivedStyle.stroke ?? style?.stroke ?? '#b1b1b7', // Use derived stroke color if available
       // Apply animation based on flowStateResult
       animationName: flowStateResult !== 'none' ? 'dashdraw' : 'none',
       animationDuration: flowStateResult !== 'none' ? animationDuration : undefined,
       animationDirection: flowStateResult === 'reverse' ? 'reverse' : 'normal',
       animationIterationCount: 'infinite',
       animationTimingFunction: 'linear',
   };
    // Clean up animation properties if none
    if (flowStateResult === 'none') {
        delete finalStyle.animationName;
        delete finalStyle.animationDuration;
        delete finalStyle.animationDirection;
        delete finalStyle.animationIterationCount;
        delete finalStyle.animationTimingFunction;
    }

  // --- Debugging Log ---
   // console.log(`Edge ${id} - Flow DP: ${flowLink?.dataPointId}, Value: ${getDataPointValue(flowLink?.dataPointId, realtimeData)}, State: ${flowStateResult}, Duration: ${animationDuration}`);

  return (
    <>
      {/* Apply final computed style */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={finalStyle}/>
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{ /* Label styles... */ }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}