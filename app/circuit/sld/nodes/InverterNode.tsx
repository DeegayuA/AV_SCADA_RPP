// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow'; // Added Node type
import { motion } from 'framer-motion';
import { InverterNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ZapIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react'; // Example icons. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const InverterNode: React.FC<NodeProps<InverterNodeData> & Partial<Node<InverterNodeData>>> = (props) => { // Added Node type
  const { data, selected, isConnectable, id, type, position, zIndex, dragging } = props; // Now position is available
  const { x: xPos, y: yPos } = position || { x: 0, y: 0 };
  // Access width and height from props directly as they're not part of InverterNodeData
  const width = (props as any).width || undefined;
  const height = (props as any).height || undefined;
import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

const InverterNode: React.FC<NodeProps<InverterNodeData> & Partial<Node<InverterNodeData>>> = (props) => { // Added Node type
  const { data, selected, isConnectable, id, type, position, zIndex, dragging } = props; // Now position is available
  const { x: xPos, y: yPos } = position || { x: 0, y: 0 };
  const width = (props as any).width || undefined;
  const height = (props as any).height || undefined;
  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues, // Renamed for clarity
    dataPoints: state.dataPoints,
  }));
  
  const isNodeEditable = useMemo(() => 
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive Data Point Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline'; // Fallback to static status or default
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const powerOutput = useMemo(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, powerDataPointConfig?.dataType);
    }
    return data.config?.ratedPower ? `${data.config.ratedPower} kW (rated)` : 'N/A';
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.ratedPower]);

  const statusStyles = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') {
      return {
        borderColor: 'var(--destructive)',
        backgroundColor: 'hsla(var(--destructive-hsl)/0.1)',
        iconColor: 'text-destructive',
        textColor: 'text-destructive-foreground', // Example: ensure text is readable on colored bg
      };
    }
    if (processedStatus === 'warning') {
      return {
        borderColor: 'var(--warning)',
        backgroundColor: 'hsla(var(--warning-hsl)/0.1)',
        iconColor: 'text-yellow-500 dark:text-yellow-400',
        textColor: 'text-yellow-600 dark:text-yellow-300',
      };
    }
    if (processedStatus === 'running' || processedStatus === 'nominal' || processedStatus === 'online') {
      return {
        borderColor: 'var(--success)',
        backgroundColor: 'hsla(var(--success-hsl)/0.1)',
        iconColor: 'text-green-500 dark:text-green-400',
        textColor: 'text-green-700 dark:text-green-300',
      };
    }
    // Default for 'offline', 'standby', or unknown status
    return { 
      borderColor: 'var(--border)',
      backgroundColor: 'var(--muted)',
      iconColor: 'text-muted-foreground',
      textColor: 'text-muted-foreground',
    };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (powerOpcUaNodeId && reactivePowerValue !== undefined) {
      primaryOpcUaValues[powerOpcUaNodeId] = reactivePowerValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, powerOpcUaNodeId, reactivePowerValue, globalOpcUaNodeValues]);

  // Choose icon based on status
  const StatusIcon = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if (processedStatus === 'running' || processedStatus === 'nominal' || processedStatus === 'online') return RefreshCwIcon; 
    return ZapIcon; 
  }, [processedStatus]);

  const isDeviceRunning = useMemo(() => 
    ['running', 'nominal', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  // Merged styles: derivedNodeStyles can override statusStyles if they target the same CSS properties
  const componentStyle = {
    borderColor: derivedNodeStyles.borderColor || statusStyles.borderColor,
    backgroundColor: derivedNodeStyles.backgroundColor || statusStyles.backgroundColor,
    color: derivedNodeStyles.color || statusStyles.textColor, // For text within the node
    // any other style props...
  };

  return (
    <motion.div
      className={`
        sld-node inverter-node group w-[90px] h-[70px] rounded-lg shadow-sm
        flex flex-col items-center justify-between p-2
        border-2 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
      `}
      style={componentStyle} // Apply combined dynamic styles
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const fullNodeObject: CustomNodeType = {
                id, 
                type, 
                position: position || { x: 0, y: 0 }, // Provide default position if undefined
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

      {/* DC Input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top_dc_in"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-sky-500/60 border-2 !border-sky-600 group-hover:!bg-sky-500 react-flow__handle-common"
        title="DC Input"
      />
      {/* AC Output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_ac_out"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-amber-500/60 border-2 !border-amber-600 group-hover:!bg-amber-500 react-flow__handle-common"
        title="AC Output"
      />

      <div className="flex items-center justify-center pointer-events-none mt-0.5">
        <motion.div
          animate={isDeviceRunning && StatusIcon === RefreshCwIcon ? { rotate: 360 } : { rotate: 0 }}
          transition={isDeviceRunning && StatusIcon === RefreshCwIcon ? { loop: Infinity, ease: "linear", duration: 4 } : { duration: 0.5 }}
        >
          <StatusIcon size={18} className={statusStyles.iconColor} style={{ color: derivedNodeStyles.color || statusStyles.iconColor }} />
        </motion.div>
      </div>
      <p className="text-[9px] font-medium leading-tight text-center truncate w-full" style={{ color: derivedNodeStyles.color || statusStyles.textColor }}>
        {String(processedStatus).toUpperCase()}
      </p>
      <p className="text-[10px] font-semibold leading-tight mt-0.5 text-center truncate w-full" title={data.label} style={{ color: derivedNodeStyles.color || statusStyles.textColor }}>
        {data.label}
      </p>
      
      <p className="text-[9px] leading-tight text-center truncate w-full" style={{ color: derivedNodeStyles.color || statusStyles.textColor }} title={`Power: ${powerOutput}`}>
          {powerOutput}
      </p>
    </motion.div>
  );
};

export default memo(InverterNode);