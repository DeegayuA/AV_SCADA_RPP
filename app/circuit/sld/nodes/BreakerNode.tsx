// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BreakerNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ZapOffIcon, ZapIcon, ShieldAlertIcon, ShieldCheckIcon, AlertTriangleIcon } from 'lucide-react'; // Or custom SVG

const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const isOpen = data.status === 'open' || (data.config?.normallyOpen && data.status !== 'closed'); // Example logic for open state
  const isClosed = data.status === 'closed' || (!data.config?.normallyOpen && data.status !== 'open'); // Example logic

  const statusStyles = useMemo(() => {
    if (data.status === 'fault' || data.status === 'tripped' || data.status === 'alarm') {
      return { border: 'border-destructive dark:border-red-500', bg: 'bg-destructive/10 dark:bg-red-900/30', iconColor: 'text-destructive dark:text-red-400', main: 'text-destructive dark:text-red-400' };
    }
    if (data.status === 'warning') {
      return { border: 'border-yellow-500 dark:border-yellow-400', bg: 'bg-yellow-500/10 dark:bg-yellow-900/30', iconColor: 'text-yellow-500 dark:text-yellow-400', main: 'text-yellow-600 dark:text-yellow-400' };
    }
    if (isClosed && (data.status === 'closed' || data.status === 'nominal' || data.status === 'energized')) {
      return { border: 'border-green-600 dark:border-green-500', bg: 'bg-green-600/10 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-500', main: 'text-green-700 dark:text-green-500' };
    }
    // Open or offline/default
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-neutral-200/20 dark:bg-neutral-700/30', iconColor: 'text-neutral-500 dark:text-neutral-400', main: 'text-neutral-600 dark:text-neutral-400' };
  }, [data.status, isClosed]);

  const breakerTypeLabel = data.config?.type || 'Breaker';

  return (
    <motion.div
      className={`
        sld-node breaker-node group w-[70px] h-[90px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1.5 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />

      <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" style={{ color: statusStyles.main }} title={`${data.label} (${breakerTypeLabel})`}>
        {data.label}
      </p>
      
      {/* Simplified SVG Breaker Symbol */}
      <svg viewBox="0 0 24 24" width="32" height="32" className={`flex-grow ${statusStyles.iconColor} transition-colors`}>
        <circle cx="12" cy="7" r="2.5" fill="currentColor" /> {/* Top terminal */}
        <circle cx="12" cy="17" r="2.5" fill="currentColor" /> {/* Bottom terminal */}
        <line x1="12" y1="9.5" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1.5" /> {/* Vertical bar */}
        {/* Switch arm */}
        {isOpen ? (
            <line x1="12" y1="12" x2="18" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : ( // Closed
            <line x1="12" y1="12" x2="12" y2="7" stroke="currentColor" strokeWidth="0" /> // effectively hidden when closed this way or adjust coords
        )}
         <rect x="8" y="11" width="8" height="2" fill="currentColor" className="opacity-60" /> {/* Box body part */}
         {!isOpen && <circle cx="12" cy="12" r="1.5" fill="currentColor" /> /* Contact point when closed */ }
      </svg>

      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel}>
        {data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel.toUpperCase()}
      </p>
    </motion.div>
  );
};
// Add sld-handle-style to your global CSS for common handle visibility etc.
// .sld-handle-style { /* Basic opacity/hover logic already in PanelNode's handle classes */ }

export default memo(BreakerNode);