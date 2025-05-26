// components/sld/nodes/BusbarNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps as ReactFlowNodeProps, Handle, Position } from 'reactflow'; // Importing as ReactFlowNodeProps
import { motion } from 'framer-motion';
import { BusbarNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType

// Extended NodeProps with position property
interface NodeProps<T = any> extends ReactFlowNodeProps<T> {
  position: { x: number; y: number };
  width?: number;
  height?: number;
}
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle, formatDisplayValue } from './nodeUtils';
import { MinusIcon, InfoIcon } from 'lucide-react'; // Simple representation for a busbar. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const BusbarNode: React.FC<NodeProps<BusbarNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging, position } = props; // Corrected destructuring
  const xPos = position?.x ?? 0;
  const yPos = position?.y ?? 0;
  const width = props.width ?? null;
  const height = props.height ?? null;
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Changed realtimeData to opcUaNodeValues
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Changed
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'de-energized'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const statusColorClass = useMemo(() => {
    // This provides a fallback class if not overridden by a DPLink targeting 'backgroundColor' or 'fillColor'
    if (processedStatus === 'fault' || processedStatus === 'alarm') return 'bg-destructive dark:bg-red-700';
    if (processedStatus === 'energized' || processedStatus === 'nominal') return 'bg-green-500 dark:bg-green-600';
    return 'bg-neutral-400 dark:bg-neutral-600'; // De-energized, offline, or unknown
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() =>
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

  // Display voltage or other info if linked
  const displayInfo = useMemo(() => {
    const voltageLink = data.dataPointLinks?.find(link => link.targetProperty === 'voltage');
    if (voltageLink && dataPoints && dataPoints[voltageLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[voltageLink.dataPointId];
      const rawValue = getDataPointValue(voltageLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, voltageLink);
      return formatDisplayValue(mappedValue, voltageLink.format, dpMeta?.dataType);
    }
    // Could add other parameters like frequency, etc.
    return data.label; // Fallback to label if no specific info DPLink
  }, [data.dataPointLinks, data.label, opcUaNodeValues, dataPoints]);


  // Dimensions for a horizontal busbar by default
  const busbarWidth = data.config?.width || 150; // Allow config override
  const busbarHeight = data.config?.height || 12;

  const mainDivClasses = `
    sld-node busbar-node group
    rounded shadow-sm 
    flex items-center justify-center relative
    border border-transparent hover:border-primary/30
    transition-all duration-150
    ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' :
      selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
  `;

  // The busbar's actual visual bar. Its background color can be set by statusColorClass or by a DPLink via derivedNodeStyles.backgroundColor
  const busbarVisualClasses = `w-full h-full rounded-sm transition-colors duration-300 ${derivedNodeStyles.backgroundColor ? '' : statusColorClass}`;

  return (
    <motion.div
      className={mainDivClasses}
      style={{
        width: `${busbarWidth}px`,
        height: `${busbarHeight}px`,
        // Apply other derived styles like opacity, etc., but not backgroundColor here as it's on the inner div.
        // However, if derivedNodeStyles is intended to style the *container*, it's fine.
        // For this component, usually the bar itself shows the color status.
        borderColor: derivedNodeStyles.borderColor, // Example of applying other derived styles
        opacity: derivedNodeStyles.opacity,
      }}
      variants={{ hover: { scale: isNodeEditable ? 1.02 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0" // Adjusted for busbar, typically small
          style={{ top: `-${(height || busbarHeight) / 2 - 2}px`, right: '-5px' }} // Example dynamic positioning if needed, or fixed like others
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

      <div
        className={busbarVisualClasses}
        style={{ backgroundColor: derivedNodeStyles.backgroundColor }} // Allows DPLink to override statusColorClass
      />

      {/* Handles */}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`top-${pos}`} type="target" position={Position.Top} id={`top-${pos * 100}`}
          style={{ left: `${pos * 100}%` }} isConnectable={isConnectable}
          className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
        />
      ))}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`bottom-${pos}`} type="source" position={Position.Bottom} id={`bottom-${pos * 100}`}
          style={{ left: `${pos * 100}%` }} isConnectable={isConnectable}
          className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
        />
      ))}
      <Handle
        type="target" position={Position.Left} id="left" isConnectable={isConnectable}
        className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
      />
      <Handle
        type="source" position={Position.Right} id="right" isConnectable={isConnectable}
        className="!w-2.5 !h-2.5 !bg-neutral-400/70 dark:!bg-neutral-500/70 border !border-neutral-500 dark:!border-neutral-400 group-hover:!bg-primary/70 dark:group-hover:!bg-blue-400/70 react-flow__handle-common !opacity-0 group-hover:!opacity-100 transition-opacity"
      />

      {(displayInfo || data.label) && ( // Show label or displayInfo if available
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center"
          style={{ width: `${busbarWidth * 1.2}px` }}
        >
          <p className="text-[9px] font-medium text-muted-foreground dark:text-neutral-400 truncate"
            style={{ color: derivedNodeStyles.color }} // Allow DPLink to color label text
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