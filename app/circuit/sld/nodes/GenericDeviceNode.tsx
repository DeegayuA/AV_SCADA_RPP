// components/sld/nodes/GenericDeviceNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GenericDeviceNodeData, CustomNodeType, DataPoint } from '@/types/sld'; // Added CustomNodeType, DataPoint
import { useAppStore } from '@/stores/appStore';
import { BoxIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, InfoIcon } from 'lucide-react'; // Default icon, Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button
import { getDataPointValue, applyValueMapping, formatDisplayValue } from './nodeUtils'; // Added imports

const GenericDeviceNode: React.FC<NodeProps<GenericDeviceNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const linkedDataValues = useMemo(() => {
    if (!data.dataPointLinks || !opcUaNodeValues || !dataPoints) {
      return [];
    }
    return data.dataPointLinks.map(link => {
      const dpMeta = dataPoints[link.dataPointId] as DataPoint | undefined;
      const label = dpMeta?.label || dpMeta?.name || link.dataPointId;
      const rawValue = getDataPointValue(link.dataPointId, dataPoints, opcUaNodeValues);
      const mappedValue = applyValueMapping(rawValue, link);
      const formattedValue = formatDisplayValue(mappedValue, link.format, dpMeta?.dataType);
      return {
        label: label,
        value: formattedValue,
        key: `${link.dataPointId}-${link.targetProperty}` // Ensure unique key if multiple links point to same DP
      };
    }).filter(item => item.value !== undefined && item.value !== null && item.value !== '-'); // Filter out empty/default values
  }, [data.dataPointLinks, opcUaNodeValues, dataPoints]);

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
        sld-node generic-device-node group w-[90px] h-[95px] rounded-lg shadow-md 
        flex flex-col items-center justify-start p-1.5 
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
                position: { x: xPos, y: yPos }, // Construct position from xPos and yPos
                data, 
                selected, 
                dragging, 
                zIndex,
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Generic devices often have both input and output */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      {/* Optional side handles if it's a passthrough or branching device */}
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" title="Side Input"/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" title="Side Output"/>

      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={20} className="my-0.5 transition-colors" /> {/* Adjusted icon size slightly */}
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight mb-0.5" title={deviceTypeDisplay}>
        {deviceTypeDisplay}
      </p>

      {linkedDataValues.length > 0 && (
        <div className="data-display-area mt-0.5 w-full text-left text-[7px] overflow-y-auto max-h-[26px] px-0.5">
          {linkedDataValues.map(item => (
            <div key={item.key} className="flex justify-between items-center leading-tight">
              <span className="truncate flex-1 mr-0.5" title={item.label}>{item.label}:</span>
              <span className="font-semibold truncate max-w-[50%]" title={item.value}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default memo(GenericDeviceNode);