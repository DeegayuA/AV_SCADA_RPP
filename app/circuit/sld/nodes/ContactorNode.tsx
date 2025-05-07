// components/sld/nodes/ContactorNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ContactorNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDerivedStyle, getDerivedDisplayText } from './nodeUtils';
import { Zap, ToggleLeft, ToggleRight } from 'lucide-react'; // Icons for state

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = ({ data, selected }) => {
  const realtimeData = useAppStore((state) => state.realtimeData);
  const derivedStyle = getDerivedStyle(data, realtimeData);

  // Example: Get state based on a linked data point (e.g., 'contactor-k1-state')
  const stateLink = data.dataPointLinks?.find(link => link.targetProperty === 'state');
  const stateValue = stateLink ? getDerivedDisplayText(data, realtimeData, 'state') : null; // Use helper
  const isClosed = stateValue === 'true' || stateValue === '1' || stateValue === 'closed' || stateValue === 'on'; // Interpret state

  // Determine icon based on state (and potentially normally open/closed config)
  const normallyOpen = data.config?.normallyOpen ?? true;
  const Icon = isClosed ? ToggleRight : ToggleLeft;
  const iconColor = isClosed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";


  return (
    <div
      className={`sld-node contactor-node p-2 border-2 rounded-md shadow-sm w-20 ${
        selected ? 'ring-2 ring-offset-1 ring-blue-600 dark:ring-sky-500 outline-none' : ''
      } ${ derivedStyle.backgroundColor ? '' : 'bg-gray-100 dark:bg-gray-700' } ${ derivedStyle.borderColor ? '' : 'border-gray-400 dark:border-gray-600' }`}
      style={derivedStyle}
      title={data.label || 'Contactor'}
    >
      {/* Input Handle */}
      <Handle type="target" position={Position.Top} id="in" className="!bg-red-500 !w-2 !h-2" isConnectable={true} />
      {/* Output Handle */}
      <Handle type="source" position={Position.Bottom} id="out" className="!bg-red-500 !w-2 !h-2" isConnectable={true} />
       {/* Optional: Coil handles */}
      <Handle type="target" position={Position.Left} id="coil-a1" className="!top-1/3 !bg-blue-500 !w-2 !h-2" isConnectable={true} title="Coil A1"/>
      <Handle type="target" position={Position.Left} id="coil-a2" className="!top-2/3 !bg-blue-500 !w-2 !h-2" isConnectable={true} title="Coil A2"/>


      <div className="flex flex-col items-center text-center">
         {/* State Icon */}
         <Icon size={20} className={`mb-1 ${iconColor}`} />

        {/* Label */}
        <div className="text-[10px] font-semibold leading-tight truncate px-1">
          {data.label || 'Contactor'}
        </div>
        <div className="text-[9px] text-muted-foreground">
            {normallyOpen ? '(NO)' : '(NC)'} {isClosed ? 'Closed' : 'Open'}
        </div>
      </div>
    </div>
  );
};

export default memo(ContactorNode);