// components/sld/nodes/PLCNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { PLCNodeData, CustomNodeType } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { CpuIcon, NetworkIcon, AlertTriangleIcon, CheckSquareIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const PLCNode: React.FC<NodeProps<PLCNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, dragging, zIndex, xPos, yPos } = props; // Fixed destructuring
  const position = { x: xPos, y: yPos }; // Access position using xPos and yPos
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

  const { StatusIcon, statusText, styleClasses } = useMemo(() => {
    let icon = CpuIcon;
    let text = data.status || 'Idle';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/30 text-muted-foreground';

    switch (data.status) {
      case 'fault': case 'alarm':
        icon = AlertTriangleIcon; text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'running': case 'online': case 'ok':
        icon = CheckSquareIcon; text = 'RUNNING';
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'stopped': case 'offline':
        icon = CpuIcon; text = 'STOPPED';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-70'; break;
    }
    return { StatusIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(data.status);

  useEffect(() => {
    if (prevStatusRef.current !== data.status) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700); // Match animation duration
      prevStatusRef.current = data.status;
      return () => clearTimeout(timer);
    }
  }, [data.status]);

  return (
    <motion.div
      className={`
        sld-node plc-node group custom-node-hover w-[100px] h-[70px] rounded-lg shadow-md
        flex flex-col items-center justify-between /* p-2 removed, moved to content wrapper */
        border-2 ${styleClasses.split(' ').filter(c => c.startsWith('border-')).join(' ')} /* Keep only border from styleClasses */
        /* bg-card, text-foreground and specific bg/text from styleClasses removed, moved to content wrapper */
        /* transition-all duration-150 is part of custom-node-hover */
        /* selected ring styles removed */
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        /* hover:shadow-lg removed */
      `}
      // variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation(); // Prevent node selection
            const fullNodeObject: CustomNodeType = {
                id, type, position, data, selected, dragging, zIndex, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Handles are outside node-content-wrapper */}
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="sld-handle-style !-mt-1" title="Power In"/>
      <Handle type="source" position={Position.Bottom} id="network_out" isConnectable={isConnectable} className="sld-handle-style !-mb-1" title="Network/IO"/>
      <Handle type="target" position={Position.Left} id="digital_in" isConnectable={isConnectable} className="sld-handle-style !-ml-1" title="Digital Inputs"/>
      <Handle type="source" position={Position.Right} id="digital_out" isConnectable={isConnectable} className="sld-handle-style !-mr-1" title="Digital Outputs"/>

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div className={`
          node-content-wrapper flex flex-col items-center justify-between p-2 w-full h-full rounded-md
          ${styleClasses.split(' ').filter(c => !c.startsWith('border-')).join(' ')} /* Keep bg and text from styleClasses */
          bg-card dark:bg-neutral-800 text-foreground /* Base background and text */
          ${isRecentStatusChange ? 'animate-status-highlight' : ''}
        `}
      >
        <p className="text-[10px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label} {/* Text color will be inherited */}
        </p>
        
        <StatusIcon size={22} className="my-0.5 transition-colors" /> {/* Icon color will be inherited */}
        
        <p className="text-[9px] font-medium text-center truncate w-full leading-tight">
          {statusText} {/* Text color will be inherited */}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(PLCNode);