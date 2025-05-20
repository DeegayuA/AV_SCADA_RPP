// components/sld/nodes/FuseNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData } from '@/types/sld'; // Assuming FuseNodeData is like BaseNodeData or you create specific one
import { useAppStore } from '@/stores/appStore';
import { ZapIcon, ShieldOffIcon, AlertTriangleIcon } from 'lucide-react'; // Placeholder, custom SVG better

interface FuseNodeData extends BaseNodeData { // Example specific data
    config?: BaseNodeData['config'] & {
        ratingAmps?: number;
        type?: 'Cartridge' | 'Blade' | 'HRC';
    }
}

const FuseNode: React.FC<NodeProps<FuseNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const { statusText, styleClasses, BlownIcon } = useMemo(() => {
    let icon: React.ElementType | null = null;
    let text = data.status || 'OK';
    let classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400';

    // Fuses are either OK (nominal) or blown (fault/alarm)
    if (data.status === 'blown' || data.status === 'fault' || data.status === 'alarm') {
      icon = ShieldOffIcon; text = 'BLOWN';
      classes = 'border-destructive bg-destructive/10 text-destructive';
    } else if (data.status === 'warning') { // E.g. approaching rating
      icon = AlertTriangleIcon; text = 'Warning';
      classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    } else { // Nominal / OK
      icon = null; // No specific icon for nominal, symbol is enough
      text = 'OK';
    }
    return { BlownIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status]);

  // Simplified SVG for Fuse (Rectangle with line)
  const fuseSymbolSVG = (
    <svg viewBox="0 0 24 12" width="36" height="18" className={`transition-colors ${styleClasses}`}>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" />
      {/* If blown, you could add a break in the line or a small explosion mark */}
      {(data.status === 'blown' || data.status === 'fault') && (
        <>
         <line x1="10" y1="4" x2="14" y2="8" stroke="currentColor" strokeWidth="1" />
         <line x1="10" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1" />
        </>
      )}
    </svg>
  );


  return (
    <motion.div
      className={`
        sld-node fuse-node group w-[60px] h-[75px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1.5
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />

      <p className="text-[9px] font-semibold text-center truncate w-full" style={{color: 'var(--foreground)'}} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none relative">
        {fuseSymbolSVG}
        {BlownIcon && <BlownIcon size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80" />}
      </div>
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={data.config?.ratingAmps ? `${data.config.ratingAmps}A` : 'Fuse'}>
        {data.config?.ratingAmps ? `${data.config.ratingAmps}A` : statusText}
      </p>
    </motion.div>
  );
};

export default memo(FuseNode);