// components/sld/nodes/IsolatorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData } from '@/types/sld'; // Assuming IsolatorNodeData, can be more specific
import { useAppStore } from '@/stores/appStore';
import { UnplugIcon, PlugZapIcon } from 'lucide-react'; // For open/closed states

interface IsolatorNodeData extends BaseNodeData { // Example specific data
    config?: BaseNodeData['config'] & {
        poles?: number;
        loadBreak?: boolean; // Is it a load-break switch?
    }
}

const IsolatorNode: React.FC<NodeProps<IsolatorNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const isOpen = data.status === 'open' || data.status === 'isolated';
  const isClosed = data.status === 'closed' || data.status === 'connected' || data.status === 'nominal';

  const { StatusIcon, statusText, styleClasses, textStyle } = useMemo(() => {
    if (isOpen) {
      return { 
        StatusIcon: UnplugIcon, 
        statusText: 'OPEN', 
        styleClasses: 'border-amber-500 bg-amber-500/10', 
        textStyle: 'text-amber-600 dark:text-amber-400' 
      };
    }
    // Closed or default
    return {
      StatusIcon: PlugZapIcon, 
      statusText: 'CLOSED', 
      styleClasses: 'border-green-500 bg-green-500/10', 
      textStyle: 'text-green-600 dark:text-green-400' 
    };
  }, [isOpen]);

  // Simplified SVG for Isolator switch arm
  const isolatorArmSVG = (
    <svg viewBox="0 0 10 20" width="12" height="24" className={`${textStyle} transition-transform duration-300 ease-in-out`}
         style={{ transform: isOpen ? 'rotate(-45deg) translate(-2px, 2px)' : 'rotate(0deg)'}}>
        <line x1="5" y1="0" x2="5" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  return (
    <motion.div
      className={`
        sld-node isolator-node group w-[50px] h-[70px] rounded-md shadow-sm
        flex flex-col items-center justify-between pt-1 pb-1.5 px-0.5
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
      <p className="text-[8px] font-medium text-center truncate w-full leading-none" style={{color: 'var(--foreground)'}} title={data.label}>
        {data.label}
      </p>
      
      {/* Visual Representation: Top Circle, Arm, Bottom Circle */}
      <div className="flex flex-col items-center my-0.5 pointer-events-none h-[28px] overflow-hidden">
         <div className={`w-1.5 h-1.5 rounded-full ${textStyle === 'text-muted-foreground' ? 'bg-neutral-500' : 'bg-current'}`}></div> {/* Top contact */}
         {isolatorArmSVG}
         <div className={`w-1.5 h-1.5 rounded-full ${textStyle === 'text-muted-foreground' ? 'bg-neutral-500' : 'bg-current'}`}></div> {/* Bottom contact */}
      </div>
      
      <p className={`text-[9px] font-bold leading-tight ${textStyle}`}>
        {statusText}
      </p>
    </motion.div>
  );
};

export default memo(IsolatorNode);