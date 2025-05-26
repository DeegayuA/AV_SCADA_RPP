// components/sld/nodes/PTNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { LocateFixedIcon, InfoIcon } from 'lucide-react'; // Placeholder, custom SVG better. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface PTNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        ratio?: string; // e.g., "11kV/110V"
        accuracyClass?: string;
        burdenVA?: number;
    }
}

const PTNode: React.FC<NodeProps<PTNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props; // Adjusted destructuring
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Added opcUaNodeValues, dataPoints
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Added
    dataPoints: state.dataPoints, // Added
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusStyles = useMemo(() => {
    if (data.status === 'fault' || data.status === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/5 dark:bg-destructive/10', symbolColor: 'text-destructive' };
    return { border: 'border-blue-500 dark:border-blue-400', bg: 'bg-blue-500/5 dark:bg-blue-400/10', symbolColor: 'text-blue-600 dark:text-blue-400' };
  }, [data.status]);

  // Simplified PT Symbol (Two separated coils, often with core lines)
  const ptSymbolSVG = (
    <svg viewBox="0 0 24 24" width="28" height="28" className={`${statusStyles.symbolColor} transition-colors`}>
      {/* Primary coil */}
      <path d="M6 7 C 6 4, 10 4, 10 7 S 14 10, 14 7 S 18 4, 18 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Core lines */}
      <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Secondary coil */}
      <path d="M6 17 C 6 14, 10 14, 10 17 S 14 20, 14 17 S 18 14, 18 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
       {/* Connection to Primary (Top) */}
      <line x1="12" y1="0" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor"/> 
    </svg>
  );

  return (
    <motion.div
      className={`
        sld-node pt-node group w-[60px] h-[70px] rounded-md shadow
        flex flex-col items-center justify-between pt-1 pb-1.5 px-1
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, 
                type, 
                position: { x: xPos, y: yPos }, // Use xPos, yPos for position
                data, 
                selected, 
                dragging, 
                zIndex, 
                width, 
                height, 
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* PT connects to one point on the line (e.g., top) and secondary goes to measurement/protection */}
      <Handle type="target" position={Position.Top} id="primary_tap" isConnectable={isConnectable} className="!w-3 !h-3 !-mt-0.5 sld-handle-style" title="Primary Tap"/>
      {/* Secondary signal output */}
      <Handle type="source" position={Position.Bottom} id="secondary_signal_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Secondary Signal"/>

      <p className="text-[8px] font-semibold text-center truncate w-full leading-tight" title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {ptSymbolSVG}
      </div>
      
      <p className="text-[7px] text-muted-foreground text-center truncate w-full leading-none" title={data.config?.ratio}>
        {data.config?.ratio || 'PT'}
      </p>
    </motion.div>
  );
};

export default memo(PTNode);