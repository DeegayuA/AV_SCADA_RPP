// components/sld/nodes/CTNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType } from '@/types/sld'; // Use BaseNodeData or create specific CTNodeData. Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { ZoomInIcon, ScanSearchIcon, InfoIcon } from 'lucide-react'; // Placeholder, custom SVG better. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface CTNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        ratio?: string; // e.g., "100/5A"
        accuracyClass?: string; // e.g., "0.5S"
        burdenVA?: number;
    }
}

const CTNode: React.FC<NodeProps<CTNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props; // Adjusted destructuring
  const { isEditMode, currentUser, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusStyles = useMemo(() => {
    // CTs typically don't have a complex 'status' beyond 'ok' or 'faulty'
    if (data.status === 'fault' || data.status === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/5 dark:bg-destructive/10', symbolColor: 'text-destructive' };
    // Nominal
    return { border: 'border-sky-500 dark:border-sky-400', bg: 'bg-sky-500/5 dark:bg-sky-400/10', symbolColor: 'text-sky-600 dark:text-sky-400' };
  }, [data.status]);

  // Simplified CT Symbol (a ring, conductor passes through)
  const ctSymbolSVG = (
    <svg viewBox="0 0 24 24" width="28" height="28" className={`${statusStyles.symbolColor} transition-colors`}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Output terminals/dots for secondary winding */}
      <circle cx="12" cy="3.5" r="1" fill="currentColor" />
      <circle cx="20.5" cy="12" r="1" fill="currentColor" />
      {/* Optional: a line passing through representing the primary conductor if not implied by edges */}
      {/* <line x1="0" y1="12" x2="24" y2="12" stroke="var(--border)" strokeWidth="2" strokeDasharray="2 2" /> */}
    </svg>
  );

  return (
    <motion.div
      className={`
        sld-node ct-node group w-[60px] h-[70px] rounded-md shadow
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
                width: width === null ? undefined : width, 
                height: height === null ? undefined : height, 
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* CT is typically in-line with a main conductor, with a signal output */}
      {/* Primary current flows through, usually top-to-bottom */}
      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="!w-3 !h-3 !-mt-0.5 sld-handle-style" title="Primary In"/>
      <Handle type="source" position={Position.Bottom} id="primary_out" isConnectable={isConnectable} className="!w-3 !h-3 !-mb-0.5 sld-handle-style" title="Primary Out"/>
      {/* Secondary signal output (e.g., to a meter or relay) */}
      <Handle type="source" position={Position.Right} id="secondary_signal_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Secondary Signal"/>


      <p className="text-[8px] font-semibold text-center truncate w-full leading-tight" title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        {ctSymbolSVG}
      </div>
      
      <p className="text-[7px] text-muted-foreground text-center truncate w-full leading-none" title={data.config?.ratio}>
        {data.config?.ratio || 'CT'}
      </p>
    </motion.div>
  );
};

export default memo(CTNode);