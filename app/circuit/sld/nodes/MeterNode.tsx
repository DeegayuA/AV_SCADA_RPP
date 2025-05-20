// components/sld/nodes/MeterNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { MeterNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { GaugeIcon, TerminalSquareIcon } from 'lucide-react';

const MeterNode: React.FC<NodeProps<MeterNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusStyles = useMemo(() => {
    // Simplified example
    if (data.status === 'fault' || data.status === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/10', iconColor: 'text-destructive' };
    if (data.status === 'warning') 
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500' };
    if (data.status === 'reading' || data.status === 'nominal') 
      return { border: 'border-sky-500', bg: 'bg-sky-500/10', iconColor: 'text-sky-500' };
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-muted/30', iconColor: 'text-muted-foreground' };
  }, [data.status]);

  return (
    <motion.div
      className={`
        sld-node meter-node group w-[80px] h-[70px] rounded-lg shadow-lg
        flex flex-col items-center justify-between p-1.5 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />

      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <GaugeIcon size={24} className={`my-1 ${statusStyles.iconColor} transition-colors`} />
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight">
        {data.config?.meterType || 'Meter'}
      </p>
    </motion.div>
  );
};

export default memo(MeterNode);