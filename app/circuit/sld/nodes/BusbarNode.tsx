// components/sld/nodes/BusbarNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps as ReactFlowNodeProps, Handle, Position } from 'reactflow'; // Importing as ReactFlowNodeProps
import { motion } from 'framer-motion';
import { BusbarNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle, formatDisplayValue } from './nodeUtils';
import { MinusIcon, InfoIcon } from 'lucide-react'; // Simple representation for a busbar. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

// Extended NodeProps with position property
interface NodeProps<T = any> extends ReactFlowNodeProps<T> {
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

const BusbarNode: React.FC<NodeProps<BusbarNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, zIndex, dragging, position } = props;
  const xPos = position?.x ?? 0;
  const yPos = position?.y ?? 0;
  const width = props.width ?? null;
  const height = props.height ?? null;
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

  const voltageLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'voltage'), [data.dataPointLinks]);
  const voltageDataPointConfig = useMemo(() => voltageLink ? dataPoints[voltageLink.dataPointId] : undefined, [voltageLink, dataPoints]);
  const voltageOpcUaNodeId = useMemo(() => voltageDataPointConfig?.nodeId, [voltageDataPointConfig]);
  const reactiveVoltageValue = useOpcUaNodeValue(voltageOpcUaNodeId);
  // --- End Reactive Data Point Handling ---

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'de-energized'; // Default status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const statusColorClass = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return 'bg-destructive dark:bg-red-700';
    if (processedStatus === 'energized' || processedStatus === 'nominal') return 'bg-green-500 dark:bg-green-600';
    return 'bg-neutral-400 dark:bg-neutral-600'; // De-energized, offline, or unknown
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (voltageOpcUaNodeId && reactiveVoltageValue !== undefined) {
      primaryOpcUaValues[voltageOpcUaNodeId] = reactiveVoltageValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, voltageOpcUaNodeId, reactiveVoltageValue, globalOpcUaNodeValues]);

  // Display voltage or other info if linked
  const displayInfo = useMemo(() => {
    if (voltageLink && voltageDataPointConfig && reactiveVoltageValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveVoltageValue, voltageLink);
      return formatDisplayValue(mappedValue, voltageLink.format, voltageDataPointConfig?.dataType);
    }
    return data.label; // Fallback to label if no specific info DPLink
  }, [voltageLink, voltageDataPointConfig, reactiveVoltageValue, data.label]);


  // Dimensions for a horizontal busbar by default
  const busbarWidth = data.config?.width || 150; // Allow config override
  const busbarHeight = data.config?.height || 12;

  const mainDivClasses = `
    sld-node busbar-node group custom-node-hover
    rounded shadow-sm 
    flex items-center justify-center relative
    /* border border-transparent removed, selection border will be on node-content-wrapper */
    /* transition-all duration-150 is part of custom-node-hover */
    ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
    /* ring styles removed, selection style will be on node-content-wrapper */
  `;

  // The busbar's actual visual bar. Its background color can be set by statusColorClass or by a DPLink.
  // Added node-content-wrapper here.
  const busbarVisualClasses = `node-content-wrapper w-full h-full rounded-sm transition-colors duration-300 ${derivedNodeStyles.backgroundColor ? '' : statusColorClass}`;

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
      className={mainDivClasses}
      style={{
        width: `${busbarWidth}px`,
        height: `${busbarHeight}px`,
        borderColor: derivedNodeStyles.borderColor, // Keep this if it's for the outer container specifically
        opacity: derivedNodeStyles.opacity,
        // backgroundColor for the main motion.div should be transparent or a base card color if the inner bar doesn't fill it.
        // Given busbarVisualClasses is w-full h-full, this should be fine.
      }}
      // variants={{ hover: { scale: isNodeEditable ? 1.02 : 1 }, initial: { scale: 1 } }} // Let CSS handle hover scale through custom-node-hover if defined, or keep for framer-motion specific
      // whileHover="hover" // Let CSS handle hover effects via custom-node-hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full z-20 bg-background/70 hover:bg-secondary/90 p-0.5" // Adjusted for busbar
          onClick={(e) => {
            e.stopPropagation(); // Prevent node selection/drag
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

      <div
        className={`${busbarVisualClasses} ${isRecentStatusChange ? 'animate-status-highlight' : ''}`}
        style={{ backgroundColor: derivedNodeStyles.backgroundColor }} // Allows DPLink to override statusColorClass
      />

      {/* Handles */}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`top-${pos}`} type="target" position={Position.Top} id={`top-${pos * 100}`}
          style={{ left: `${pos * 100}%` }} isConnectable={isConnectable}
          className="react-flow__handle-common sld-handle-style" // Use global style, size from global
        />
      ))}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`bottom-${pos}`} type="source" position={Position.Bottom} id={`bottom-${pos * 100}`}
          style={{ left: `${pos * 100}%` }} isConnectable={isConnectable}
          className="react-flow__handle-common sld-handle-style" // Use global style
        />
      ))}
      <Handle
        type="target" position={Position.Left} id="left" isConnectable={isConnectable}
        className="react-flow__handle-common sld-handle-style" // Use global style
      />
      <Handle
        type="source" position={Position.Right} id="right" isConnectable={isConnectable}
        className="react-flow__handle-common sld-handle-style" // Use global style
      />

      {/* Label is positioned absolutely, outside the main colored bar, so it won't get selection styling directly */}
      {(displayInfo || data.label) && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center pointer-events-none" // pointer-events-none for label
          style={{ width: `${busbarWidth * 1.2}px` }}
        >
          <p className="text-[9px] font-medium text-muted-foreground dark:text-neutral-400 truncate"
            style={{ color: derivedNodeStyles.color }} 
            title={displayInfo || data.label}
          >
            {displayInfo || data.label}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default memo(BusbarNode);