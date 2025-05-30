// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow'; // Added Node type
import { motion } from 'framer-motion';
import { InverterNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ZapIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react'; // Example icons. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button
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
    iconColor: derivedNodeStyles.color || statusStyles.iconColor, // Added for explicit icon color control
    // any other style props...
  };

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);

  useEffect(() => {
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700); // Match animation duration
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
  }, [processedStatus]);

  return (
    <motion.div
      className={`
        sld-node inverter-node group custom-node-hover w-[90px] h-[70px] rounded-lg shadow-sm
        flex flex-col items-center justify-between /* p-2 removed, will be on content wrapper */
        border-2 
        /* transition-all duration-150 is part of custom-node-hover */
        /* selected ring styles removed */
        ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
        /* hover:shadow-lg removed */
      `}
      style={{ borderColor: componentStyle.borderColor, /* other non-layout styles for outer div if any */ }}
      // variants={{ hover: { scale: isNodeEditable ? 1.02 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-5 w-5 text-primary/80 z-10" // Ensure button is above content
        onClick={(e) => {
            e.stopPropagation(); // Prevent node selection
            const fullNodeObject: CustomNodeType = {
                id, type, 
                position: position || { x: 0, y: 0 }, 
                data, selected, dragging, zIndex, width, height, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-full w-full" />
        </Button>

      {/* Handles are outside node-content-wrapper */}
      <Handle
        type="target"
        position={Position.Top}
        id="top_dc_in"
        isConnectable={isConnectable}
        className="react-flow__handle-common sld-handle-style"
        title="DC Input"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom_ac_out"
        isConnectable={isConnectable}
        className="react-flow__handle-common sld-handle-style"
        title="AC Output"
      />

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-2 w-full h-full ${isRecentStatusChange ? 'animate-status-highlight' : ''}`}
        style={{ backgroundColor: componentStyle.backgroundColor, color: componentStyle.color }}
      >
        <div className="flex items-center justify-center pointer-events-none mt-0.5">
          <motion.div
            animate={isDeviceRunning && StatusIcon === RefreshCwIcon ? { rotate: 360 } : { rotate: 0 }}
            transition={isDeviceRunning && StatusIcon === RefreshCwIcon ? { loop: Infinity, ease: "linear", duration: 4 } : { duration: 0.5 }}
          >
            {/* Applied iconColor directly here from componentStyle, which includes derived or status based */}
            <StatusIcon size={18} style={{ color: componentStyle.iconColor }} />
          </motion.div>
        </div>
        <p className="text-[9px] font-medium leading-tight text-center truncate w-full">
          {String(processedStatus).toUpperCase()}
        </p>
        <p className="text-[10px] font-semibold leading-tight mt-0.5 text-center truncate w-full" title={data.label}>
          {data.label}
        </p>
        <p className="text-[9px] leading-tight text-center truncate w-full" title={`Power: ${powerOutput}`}>
            {powerOutput}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);