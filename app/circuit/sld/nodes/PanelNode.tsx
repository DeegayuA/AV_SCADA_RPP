// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { PanelNodeData } from '@/types/sld'; // CustomNodeData is implicitly handled by NodeProps<PanelNodeData>
import { useAppStore } from '@/stores/appStore';
import { SunIcon } from 'lucide-react';

const PanelNode: React.FC<NodeProps<PanelNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() => 
    // Assuming admin or editor roles can edit. Adjust as per your UserRole enum and logic.
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // Determine status-based styling
  const statusClasses = useMemo(() => {
    switch (data.status) {
      case 'alarm':
      case 'fault':
        return 'border-destructive dark:border-red-400 bg-destructive/10 dark:bg-red-900/20 text-destructive-foreground';
      case 'warning':
        return 'border-yellow-500 dark:border-yellow-400 bg-yellow-500/10 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      case 'nominal':
      case 'producing':
      default: // Default to nominal/producing state appearance
        return 'border-green-600 dark:border-green-500 bg-green-600/5 dark:bg-green-900/10 text-green-700 dark:text-green-300';
    }
  }, [data.status]);

  return (
    <motion.div
      className={`
        sld-node panel-node group w-[100px] h-[60px] rounded-lg shadow-lg
        flex flex-col items-center justify-center p-1 
        border-2 relative 
        bg-card dark:bg-neutral-800 
        transition-all duration-200 ease-in-out
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-900 shadow-primary/30' : 
          selected ? 'ring-1 ring-accent ring-offset-1 dark:ring-offset-neutral-900 shadow-accent/20' : 
          'hover:shadow-md'} 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${statusClasses} 
      `}
      variants={{ 
        hover: { 
          scale: isNodeEditable ? 1.04 : 1, 
          boxShadow: isNodeEditable ? "0px 5px 15px rgba(0,0,0,0.1)" : "0px 2px 8px rgba(0,0,0,0.07)" 
        }, 
        initial: { scale: 1 } 
      }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 350, damping: 12 }}
    >
      {/* --- TOP HANDLE (TARGET - INPUT) --- */}
      <Handle
        type="target" 
        position={Position.Top}
        id="top_in" // Unique ID for this handle on the node
        isConnectable={isConnectable}
        className={`
          !w-3 !h-3 !-translate-y-1/2 !rounded-full
          !bg-slate-300 dark:!bg-slate-600 
          border-2 !border-slate-400 dark:!border-slate-500
          group-hover:!opacity-100 group-hover:!bg-sky-500 dark:group-hover:!bg-sky-400 group-hover:!border-sky-600 dark:group-hover:!border-sky-500
          transition-all duration-150 ease-in-out
          ${isNodeEditable && selected ? '!opacity-100 !bg-sky-400' : !isNodeEditable ? '!opacity-30' : '!opacity-0'} 
          react-flow__handle-common 
        `}
        title="DC Input (Optional)"
      />

      {/* --- BOTTOM HANDLE (SOURCE - OUTPUT) --- */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_out" // Unique ID for this handle on the node
        isConnectable={isConnectable}
        className={`
          !w-3 !h-3 !translate-y-1/2 !rounded-full
          !bg-slate-300 dark:!bg-slate-600 
          border-2 !border-slate-400 dark:!border-slate-500
          group-hover:!opacity-100 group-hover:!bg-amber-500 dark:group-hover:!bg-amber-400 group-hover:!border-amber-600 dark:group-hover:!border-amber-500
          transition-all duration-150 ease-in-out
           ${isNodeEditable && selected ? '!opacity-100 !bg-amber-400' : !isNodeEditable ? '!opacity-30' : '!opacity-0'}
          react-flow__handle-common
        `}
        title="DC Output"
      />

      {/* Node Visual Content */}
      <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
        <SunIcon 
            size={22} 
            className={`mb-0.5 transition-colors duration-300 ${data.status === 'producing' || data.status === 'nominal' ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} 
        />
        <p 
          className="text-[10px] font-semibold leading-tight text-center truncate w-[90%]" 
          title={data.label}
          style={{ color: 'inherit' }} // Inherit color from statusClasses text color
        >
          {data.label}
        </p>
         {data.config?.powerRatingWp && (
            <p className="text-[8px] text-muted-foreground/80 leading-none">
                {data.config.powerRatingWp} Wp
            </p>
        )}
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);