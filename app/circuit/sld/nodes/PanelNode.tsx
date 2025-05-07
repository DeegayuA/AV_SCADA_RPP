// components/sld/nodes/PanelNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PanelNodeData } from '@/types/sld'; // Assuming PanelNodeData exists in types
import { Sun } from 'lucide-react'; // Example icon

const PanelNode: React.FC<NodeProps<PanelNodeData>> = ({ data, selected }) => {
  // Basic styling, customize as needed
  return (
    <div
      className={`sld-node panel-node p-2 border-2 rounded-md shadow-sm bg-blue-100 ${selected ? 'ring-2 ring-offset-1 ring-blue-600 outline-none' : 'border-blue-400'}`}
    >
      {/* Output Handle (e.g., DC to Inverter) */}
      <Handle
        type="source"
        position={Position.Right}
        id="dc-out"
        className="!bg-yellow-500 w-2 h-2 !-right-1"
        isConnectable={true}
      />

      <div className="flex flex-col items-center text-center text-blue-800">
        <Sun className="w-5 h-5 mb-1" />
        <div className="text-xs font-semibold truncate">{data.label || 'Panel'}</div>
        {/* Add any data display needed */}
      </div>
    </div>
  );
};

export default memo(PanelNode);