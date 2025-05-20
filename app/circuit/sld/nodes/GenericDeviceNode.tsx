// components/sld/nodes/GenericDeviceNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GenericDeviceNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { BoxIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react'; // Default icon

const GenericDeviceNode: React.FC<NodeProps<GenericDeviceNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // Choose icon based on status or config.iconName (more complex logic needed for iconName mapping)
  const { StatusIcon, statusText, styleClasses } = useMemo(() => {
    let icon = BoxIcon;
    let text = data.status || 'Unknown';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';

    switch (data.status) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'Warning';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'nominal': case 'running': case 'active': case 'online':
        icon = CheckCircleIcon; text = data.status?.toUpperCase();
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'offline':
        icon = BoxIcon; text = 'Offline';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-70'; break;
    }
    // Future: if (data.config?.iconName) { icon = mapIconName(data.config.iconName); }
    return { StatusIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status, data.config?.iconName]);
  
  const deviceTypeDisplay = data.config?.deviceType || 'Device';

  return (
    <motion.div
      className={`
        sld-node generic-device-node group w-[90px] h-[75px] rounded-lg shadow-md
        flex flex-col items-center justify-between p-2
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Generic devices often have both input and output */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      {/* Optional side handles if it's a passthrough or branching device */}
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" title="Side Input"/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" title="Side Output"/>

      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={24} className="my-0.5 transition-colors" />
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={deviceTypeDisplay}>
        {deviceTypeDisplay}
      </p>
    </motion.div>
  );
};

export default memo(GenericDeviceNode);