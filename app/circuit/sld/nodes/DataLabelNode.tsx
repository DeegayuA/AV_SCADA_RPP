// components/sld/nodes/DataLabelNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DataLabelNodeData, RealTimeData } from '@/types/sld';
import { getDataPointValue, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { useAppStore } from '@/stores/appStore';

const DataLabelNode: React.FC<NodeProps<DataLabelNodeData>> = ({ data, selected }) => {
  const realtimeData = useAppStore((state) => state.realtimeData);

  // Find the primary data point link intended for display
  const displayLink = data.dataPointLinks?.find(link => link.targetProperty === 'value');
  const value = getDataPointValue(displayLink?.dataPointId, realtimeData);
  const formattedValue = displayLink ? formatDisplayValue(value, displayLink) : '-';

  // Get dynamic styles (e.g., text color based on thresholds)
  const derivedStyle = getDerivedStyle(data, realtimeData);

  const label = data.label || (displayLink?.dataPointId ? `DP: ${displayLink.dataPointId}` : 'Data Label');

  return (
    <div
      className={`sld-node data-label-node p-1 border text-xs bg-slate-100 rounded ${selected ? 'ring-2 ring-blue-500 outline-none' : 'border-slate-300'}`}
      style={derivedStyle} // Apply dynamic styles
      title={label} // Show full label on hover
    >
      {/* No handles needed for a simple label, but could add if needed */}
      {/* <Handle type="target" position={Position.Top} className="!bg-teal-500" /> */}
      {/* <Handle type="source" position={Position.Bottom} className="!bg-teal-500" /> */}
      <div className="font-medium truncate" style={{ color: derivedStyle.color }}>{label}</div>
      <div className="font-bold text-center" style={{ color: derivedStyle.color }}>{formattedValue}</div>
    </div>
  );
};

export default memo(DataLabelNode);