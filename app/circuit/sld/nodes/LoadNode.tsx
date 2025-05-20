// components/sld/nodes/LoadNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { LoadNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ArrowRightToLineIcon, SlidersHorizontalIcon } from 'lucide-react'; // Arrow for load consumption

const LoadNode: React.FC<NodeProps<LoadNodeData>> = ({ data, selected, isConnectable }) => {
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
      return { border: 'border-destructive', bg: 'bg-destructive/10', iconColor: 'text-destructive', text: 'text-destructive' };
    if (data.status === 'overload' || data.status === 'warning') 
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', iconColor: 'text-yellow-500', text: 'text-yellow-600' };
    if (data.status === 'active' || data.status === 'on' || data.status === 'nominal') 
      return { border: 'border-indigo-500', bg: 'bg-indigo-500/10', iconColor: 'text-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' };
    // Offline / off
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-muted/30', iconColor: 'text-muted-foreground', text: 'text-muted-foreground' };
  }, [data.status]);

  // Simple resistor symbol (can be replaced with more complex SVG)
  const resistorSVG = (
    <svg viewBox="0 0 24 14" width="36" height="21" className={`${statusStyles.iconColor} transition-colors`}>
      <path d="M1 7 H4 L6 11 L10 3 L14 11 L18 3 L20 7 H23" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );


  return (
    <motion.div
      className={`
        sld-node load-node group w-[100px] h-[65px] rounded-lg shadow-md
        flex flex-col items-center justify-between p-1.5
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Load is typically a target, receiving power from the top */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Power Input"/>
      {/* No bottom handle if it's purely a sink/load */}

      <p className={`text-[9px] font-semibold text-center truncate w-full ${statusStyles.text}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {resistorSVG}
      </div>
      
      <p className={`text-[8px] text-muted-foreground text-center truncate w-full leading-tight ${statusStyles.text}`}>
        {data.config?.ratedPowerkW ? `${data.config.ratedPowerkW}kW` : (data.config?.loadType || 'Load')}
      </p>
    </motion.div>
  );
};

export default memo(LoadNode);