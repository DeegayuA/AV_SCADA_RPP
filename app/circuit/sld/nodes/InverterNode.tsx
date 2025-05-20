// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { InverterNodeData, CustomNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ZapIcon, RefreshCwIcon } from 'lucide-react'; // Example icons

const InverterNode: React.FC<NodeProps<InverterNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));
  
  const isNodeEditable = useMemo(() => 
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusStyles = useMemo(() => {
    // Simplified example - expand with specific colors for each status
    if (data.status === 'fault' || data.status === 'alarm') {
      return {
        borderColor: 'var(--destructive)',
        backgroundColor: 'hsla(var(--destructive-hsl)/0.1)',
        iconColor: 'text-destructive',
      };
    }
    if (data.status === 'warning') {
      return {
        borderColor: 'var(--warning)', // Define --warning in CSS
        backgroundColor: 'hsla(var(--warning-hsl)/0.1)', // Define --warning-hsl
        iconColor: 'text-yellow-500 dark:text-yellow-400',
      };
    }
     if (data.status === 'running' || data.status === 'nominal') {
      return {
        borderColor: 'var(--success)', // Define --success in CSS
        backgroundColor: 'hsla(var(--success-hsl)/0.1)', // Define --success-hsl
        iconColor: 'text-green-500 dark:text-green-400',
      };
    }
    return { // Offline or default
      borderColor: 'var(--border)',
      backgroundColor: 'var(--muted)',
      iconColor: 'text-muted-foreground',
    };
  }, [data.status]);


  return (
    <motion.div
      className={`
        sld-node inverter-node group w-[90px] h-[70px] rounded-lg shadow-sm
        flex flex-col items-center justify-between p-2
        border-2 
        text-foreground dark:text-neutral-200
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
      `}
      style={{ 
        borderColor: statusStyles.borderColor, 
        backgroundColor: statusStyles.backgroundColor 
      }}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {/* DC Input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top_dc_in"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-sky-500/60 border-2 !border-sky-600 group-hover:!bg-sky-500 react-flow__handle-common"
        title="DC Input"
      />
      {/* AC Output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_ac_out"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-amber-500/60 border-2 !border-amber-600 group-hover:!bg-amber-500 react-flow__handle-common"
        title="AC Output"
      />

      <div className="flex items-center justify-center pointer-events-none mt-0.5">
        <RefreshCwIcon size={18} className={statusStyles.iconColor} />
      </div>
      <p className="text-[10px] font-semibold leading-tight mt-auto text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      {data.config?.ratedPower && (
        <p className="text-[8px] text-muted-foreground leading-tight text-center truncate w-full">
            {data.config.ratedPower} kW
        </p>
      )}
    </motion.div>
  );
};

export default memo(InverterNode);