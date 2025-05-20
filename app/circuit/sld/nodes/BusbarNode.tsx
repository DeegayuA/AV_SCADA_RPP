// components/sld/nodes/BusbarNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BusbarNodeData, CustomNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { MinusIcon } from 'lucide-react'; // Simple representation for a busbar

const BusbarNode: React.FC<NodeProps<BusbarNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() => 
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );
  
  const statusColor = useMemo(() => {
    // Busbars are typically just energized or not, sometimes fault.
    if (data.status === 'fault' || data.status === 'alarm') return 'bg-destructive dark:bg-red-700';
    if (data.status === 'energized' || data.status === 'nominal') return 'bg-green-500 dark:bg-green-600';
    return 'bg-neutral-400 dark:bg-neutral-600'; // De-energized or unknown
  }, [data.status]);

  // Dimensions for a horizontal busbar by default
  const busbarWidth = data.config?.width || 150; // Allow config override
  const busbarHeight = data.config?.height || 12;

  return (
    <motion.div
      className={`
        sld-node busbar-node group
        rounded shadow-sm 
        flex items-center justify-center relative
        border border-transparent hover:border-primary/30
        transition-all duration-150
        ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
      `}
      style={{ width: `${busbarWidth}px`, height: `${busbarHeight}px` }}
      variants={{ hover: { scale: isNodeEditable ? 1.02 : 1, /* Small visual feedback */ }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Main busbar visual element */}
      <div 
        className={`w-full h-full rounded-sm ${statusColor} transition-colors duration-300`}
      />

      {/* Handles - More complex due to multiple connection points */}
      {/* Top Handles (array for multiple connection points along the top) */}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`top-${pos}`}
          type="target"
          position={Position.Top}
          id={`top-${pos*100}`}
          style={{ left: `${pos * 100}%` }}
          isConnectable={isConnectable}
          className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
        />
      ))}
      {/* Bottom Handles */}
       {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`bottom-${pos}`}
          type="source"
          position={Position.Bottom}
          id={`bottom-${pos*100}`}
          style={{ left: `${pos * 100}%` }}
          isConnectable={isConnectable}
          className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
        />
      ))}
      {/* Left Handle (single, typically input or passthrough) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
      />
      {/* Right Handle (single, typically output or passthrough) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
      />
      
      {/* Label positioned below the busbar to not obstruct connections */}
      {data.label && (
        <div 
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center"
          style={{width: `${busbarWidth * 1.2}px`}} // Allow label to be slightly wider
        >
          <p className="text-[9px] font-medium text-muted-foreground dark:text-neutral-400 truncate" title={data.label}>
            {data.label}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default memo(BusbarNode);