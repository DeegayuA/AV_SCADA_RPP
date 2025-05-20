// components/sld/nodes/GridNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GridNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ArrowDownToLineIcon, ZapIcon } from 'lucide-react'; // For grid connection

const GridNode: React.FC<NodeProps<GridNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusStyles = useMemo(() => {
    if (data.status === 'fault' || data.status === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/10', iconColor: 'text-destructive' };
    if (data.status === 'disconnected' || data.status === 'offline') 
      return { border: 'border-neutral-500', bg: 'bg-neutral-500/10', iconColor: 'text-neutral-500' };
    // Connected / nominal
    return { border: 'border-sky-600 dark:border-sky-500', bg: 'bg-sky-600/10 dark:bg-sky-900/20', iconColor: 'text-sky-600 dark:text-sky-400' };
  }, [data.status]);

  return (
    <motion.div
      className={`
        sld-node grid-node group w-[120px] h-[60px] rounded-lg shadow-md
        flex flex-col items-center justify-center p-2 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Grid is typically a source, providing power downwards in our vertical layout */}
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Grid Output"/>
      {/* Optionally, a top handle if grid can also be a load target in some complex diagrams, or for bidirectional flow representation */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Grid Input (Bidirectional)"/>


      <div className="flex items-center justify-center pointer-events-none">
        <ZapIcon size={22} className={`${statusStyles.iconColor} mr-2`} />
        <ArrowDownToLineIcon size={18} className={`${statusStyles.iconColor} opacity-70`} />
      </div>
      <p className="text-[10px] font-semibold text-center truncate w-full mt-1" title={data.label}>
        {data.label}
      </p>
      {data.config?.voltageLevel && (
        <p className="text-[8px] text-muted-foreground/80 leading-none">{data.config.voltageLevel}</p>
      )}
    </motion.div>
  );
};

export default memo(GridNode);