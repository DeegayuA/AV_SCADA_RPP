// components/sld/nodes/GeneratorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GeneratorNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ZapIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, CogIcon } from 'lucide-react'; // Cog for 'G'

const GeneratorNode: React.FC<NodeProps<GeneratorNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const { StatusIcon, statusText, styleClasses } = useMemo(() => {
    let icon = CogIcon; // Default for G inside circle
    let text = data.status || 'Standby';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';

    switch (data.status) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'Warning';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'running': case 'producing': case 'online':
        icon = CheckCircleIcon; text = data.status === 'producing' ? "PROD" : "RUN"; // Shorter for display
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 animate-pulse animation-duration-2000'; break; // Pulse when running
      case 'starting':
        icon = CogIcon; text = 'Starting';
        classes = 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 animate-spin animation-duration-1000'; break;
      case 'stopping':
        icon = CogIcon; text = 'Stopping';
        classes = 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-spin animation-duration-3000 animation-direction-reverse'; break;
      case 'offline': case 'standby':
        icon = ZapIcon; text = data.status?.toUpperCase() || 'OFF'; // Could also use PowerOffIcon
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-80'; break;
    }
    return { StatusIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status]);
  
  // Generator Symbol SVG (Circle with 'G' or Sine Wave)
  const generatorSymbolSVG = (
    <svg viewBox="0 0 24 24" width="32" height="32" className={`transition-colors ${styleClasses.includes('text-muted-foreground') ? 'opacity-60' : '' }`}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        {/* Option 1: Letter G (simplified) */}
        <text x="12" y="16" fontSize="12" textAnchor="middle" fontWeight="bold" fill="currentColor">G</text>
        {/* Option 2: Sine Wave (common for AC generator) */}
        <path d="M6 12 Q9 6 12 12 T18 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );


  return (
    <motion.div
      className={`
        sld-node generator-node group w-[85px] h-[90px] rounded-lg shadow-lg
        flex flex-col items-center justify-between p-2
        border-2 ${styleClasses} 
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Generators are typically sources */}
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      {/* Optional Top Handle for control signals or fuel input if modeled */}
       <Handle type="target" position={Position.Top} id="top_control_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Control/Fuel"/>


      <p className="text-[9px] font-semibold text-center truncate w-full" style={{color: 'var(--foreground)'}} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {generatorSymbolSVG}
      </div>
      
      <div className="flex items-center justify-center gap-1">
        <StatusIcon size={10} className={`${styleClasses.includes('text-muted-foreground') ? 'opacity-60' : ''}`} />
        <p className="text-[8px] font-medium text-center truncate leading-tight" style={{color: 'var(--foreground)'}}>
          {statusText}
        </p>
      </div>
       {data.config?.ratingKVA && (
            <p className="text-[7px] text-muted-foreground/90 leading-none">{data.config.ratingKVA} kVA</p>
        )}
    </motion.div>
  );
};

export default memo(GeneratorNode);