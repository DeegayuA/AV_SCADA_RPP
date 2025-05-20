// components/sld/nodes/TransformerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { TransformerNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { GitBranchPlusIcon } from 'lucide-react'; // Placeholder, ideally custom SVG

const TransformerNode: React.FC<NodeProps<TransformerNodeData>> = ({ data, selected, isConnectable }) => {
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
      return { border: 'border-destructive', bg: 'bg-destructive/10', symbolColor: 'text-destructive' };
    if (data.status === 'warning') 
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', symbolColor: 'text-yellow-500' };
    if (data.status === 'nominal' || data.status === 'energized') 
      return { border: 'border-teal-500', bg: 'bg-teal-500/10', symbolColor: 'text-teal-500 dark:text-teal-400' };
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-muted/30', symbolColor: 'text-muted-foreground' };
  }, [data.status]);

  // Simplified SVG for Transformer (Two interlinked coils/circles)
  // Ideally, use a more standard symbol for your region
  const transformerSymbolSVG = (
    <svg viewBox="0 0 24 24" width="32" height="32" className={`${statusStyles.symbolColor} transition-colors`}>
      {/* Left coil (primary) */}
      <circle cx="8" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Right coil (secondary) */}
      <circle cx="16" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Core lines (optional) */}
      <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="12.5" y1="7" x2="12.5" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );

  return (
    <motion.div
      className={`
        sld-node transformer-node group w-[80px] h-[85px] rounded-lg shadow-lg
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
      {/* Primary side usually top for step-down, or can be left/right */}
      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Primary"/>
      {/* Secondary side */}
      <Handle type="source" position={Position.Bottom} id="secondary_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Secondary"/>

      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {transformerSymbolSVG}
      </div>
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={`${data.config?.primaryVoltage}/${data.config?.secondaryVoltage} ${data.config?.ratingMVA || ''}`}>
        {data.config?.primaryVoltage || 'HV'}/{data.config?.secondaryVoltage || 'LV'}
      </p>
    </motion.div>
  );
};

export default memo(TransformerNode);