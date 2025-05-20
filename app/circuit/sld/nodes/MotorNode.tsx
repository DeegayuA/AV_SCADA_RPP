// components/sld/nodes/MotorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData } from '@/types/sld'; // Assuming MotorNodeData or can be specific
import { useAppStore } from '@/stores/appStore';
import { CogIcon, PlayCircleIcon, PauseCircleIcon, AlertCircleIcon, XCircleIcon } from 'lucide-react';

interface MotorNodeData extends BaseNodeData { // Example specific data
    config?: BaseNodeData['config'] & {
        ratedPowerkW?: number;
        voltage?: string;
        phase?: 1 | 3;
    }
}

const MotorNode: React.FC<NodeProps<MotorNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const { StatusIcon, statusText, styleClasses, iconAnimation } = useMemo(() => {
    let icon = CogIcon;
    let text = data.status || 'Stopped';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';
    let anim = '';

    switch (data.status) {
      case 'fault': case 'alarm': case 'tripped':
        icon = XCircleIcon; text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertCircleIcon; text = 'Warning';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'running':
        icon = PlayCircleIcon; text = 'RUN'; anim = 'animate-spin animation-duration-2000';
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'stopped': case 'offline': case 'off':
        icon = PauseCircleIcon; text = 'STOP';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500'; break;
    }
    return { StatusIcon: icon, statusText: text, styleClasses: classes, iconAnimation: anim };
  }, [data.status]);

  // SVG for "M" inside a circle
  const motorSymbolSVG = (
    <svg viewBox="0 0 24 24" width="30" height="30" className={`transition-colors ${styleClasses.includes('text-muted-foreground') ? 'opacity-70' : ''} ${iconAnimation}`}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <text x="12" y="16.5" fontSize="12" textAnchor="middle" fontWeight="bold" fill="currentColor">M</text>
    </svg>
  );


  return (
    <motion.div
      className={`
        sld-node motor-node group w-[75px] h-[85px] rounded-full shadow-lg // Motors often circular
        flex flex-col items-center justify-between p-2
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Motor is a load, typically powered from top */}
      <Handle type="target" position={Position.Top} id="top_power_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Power Input"/>
      {/* Optionally, a bottom handle if it drives something mechanically that continues the diagram */}
      {/* <Handle type="source" position={Position.Bottom} id="mech_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style" /> */}


      <p className="text-[9px] font-semibold text-center truncate w-full" style={{color: 'var(--foreground)'}} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {motorSymbolSVG}
      </div>
      
      <div className="flex items-center justify-center gap-1">
         <StatusIcon size={10} className={`${styleClasses.includes('text-muted-foreground') ? 'opacity-60' : ''}`}/>
         <p className="text-[8px] font-medium text-center truncate leading-tight" style={{color: 'var(--foreground)'}}>
           {statusText}
         </p>
      </div>
       {data.config?.ratedPowerkW && (
            <p className="text-[7px] text-muted-foreground/90 leading-none">{data.config.ratedPowerkW}kW</p>
        )}
    </motion.div>
  );
};

export default memo(MotorNode);