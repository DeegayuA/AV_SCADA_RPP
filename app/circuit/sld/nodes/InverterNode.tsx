// components/sld/nodes/InverterNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { InverterNodeData, RealTimeData } from '@/types/sld';
import { getDerivedStyle, getDerivedDisplayText } from './nodeUtils';
import { useAppStore } from '@/stores/appStore';
// Consider using an SVG icon library like react-icons
// import { GiSolarPower } from 'react-icons/gi';

const InverterNode: React.FC<NodeProps<InverterNodeData>> = ({ data, selected }) => {
  const realtimeData = useAppStore((state) => state.realtimeData);
  const derivedStyle = getDerivedStyle(data, realtimeData);

  // Example: Get specific derived values using getDerivedDisplayText helper
  const powerOutput = getDerivedDisplayText(data, realtimeData, 'powerOutput'); // Look for targetProperty 'powerOutput'
  const statusText = getDerivedDisplayText(data, realtimeData, 'statusText'); // Look for targetProperty 'statusText'

  return (
    <div
      className={`sld-node inverter-node p-2 border-2 rounded-md shadow-sm bg-white ${selected ? 'ring-2 ring-offset-1 ring-blue-600 outline-none' : 'border-gray-400'}`}
      style={derivedStyle} // Apply dynamic styles (e.g., background color based on status)
    >
      {/* Input Handle (e.g., DC from Panels) */}
      <Handle
        type="target"
        position={Position.Left}
        id="dc-in"
        className="!bg-yellow-500 w-2 h-2 !-left-1"
        isConnectable={true} // Control connectability in edit mode
      />
      {/* Output Handle (e.g., AC to Grid/Load) */}
      <Handle
        type="source"
        position={Position.Right}
        id="ac-out"
        className="!bg-red-500 w-2 h-2 !-right-1"
        isConnectable={true}
      />

      <div className="flex flex-col items-center text-center">
        {/* Icon Placeholder - Replace with actual SVG or Icon component */}
        <div className="text-2xl mb-1">⚡️</div>
        {/* <GiSolarPower className="text-3xl mb-1 text-blue-600" /> */}

        <div className="text-xs font-semibold mb-1 truncate">{data.label || 'Inverter'}</div>
        {/* Display derived real-time data */}
        {powerOutput !== null && (
          <div className="text-xs font-mono">P: {powerOutput}</div>
        )}
         {statusText !== null && (
          <div className={`text-xs font-bold ${derivedStyle.color ? '' : 'text-gray-700'}`} style={{color: derivedStyle.color}}>
            {statusText}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(InverterNode);