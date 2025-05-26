// components/sld/nodes/PLCNode.tsx
import React, { memo, useMemo } from 'react';
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

  return (
    <motion.div
      className={`
        sld-node plc-node group w-[100px] h-[70px] rounded-lg shadow-md
        flex flex-col items-center justify-between p-2
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            const fullNodeObject: CustomNodeType = {
                id, 
                type, 
                position, 
                data, 
                selected, 
                dragging, 
                zIndex, 
                // width and height are not directly available in NodeProps
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* PLCs often have multiple I/O and network connections */}
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mt-1 sld-handle-style !bg-red-400 !border-red-500" title="Power In"/>
      <Handle type="source" position={Position.Bottom} id="network_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mb-1 sld-handle-style !bg-blue-400 !border-blue-500" title="Network/IO"/>
      <Handle type="target" position={Position.Left} id="digital_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-ml-1 sld-handle-style !bg-yellow-400 !border-yellow-500" title="Digital Inputs"/>
      <Handle type="source" position={Position.Right} id="digital_out" isConnectable={isConnectable} className="!w-2.5 !h-2.5 !-mr-1 sld-handle-style !bg-purple-400 !border-purple-500" title="Digital Outputs"/>


      <p className="text-[10px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={22} className="my-0.5 transition-colors" />
      
      <p className="text-[9px] font-medium text-center truncate w-full leading-tight">
        {statusText}
      </p>
    </motion.div>
  );
};

export default memo(PLCNode);