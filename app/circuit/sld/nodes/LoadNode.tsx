// components/sld/nodes/LoadNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { LoadNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ArrowRightToLineIcon, SlidersHorizontalIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Arrow for load consumption. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

// Extend NodeProps with the additional properties needed
interface ExtendedNodeProps extends NodeProps<LoadNodeData> {
  xPos: number;
  yPos: number;
  width?: number;
  height?: number;
}

const LoadNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props; // Adjusted destructuring
import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

// Extend NodeProps with the additional properties needed
interface ExtendedNodeProps extends NodeProps<LoadNodeData> {
  xPos: number;
  yPos: number;
  width?: number;
  height?: number;
}

const LoadNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props;
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

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerConsumption' || link.targetProperty === 'power'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'off'; // Default status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const powerConsumption = useMemo(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, powerDataPointConfig?.dataType);
    }
    return data.config?.ratedPowerkW ? `${data.config.ratedPowerkW}kW (rated)` : (data.config?.loadType || 'Load');
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config]);

  const statusStyles = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', iconColorClass: 'text-destructive', textClass: 'text-destructive-foreground' };
    if (processedStatus === 'overload' || processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', iconColorClass: 'text-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-300' };
    if (processedStatus === 'active' || processedStatus === 'on' || processedStatus === 'nominal') 
      return { borderClass: 'border-indigo-500', bgClass: 'bg-indigo-500/10', iconColorClass: 'text-indigo-500', textClass: 'text-indigo-600 dark:text-indigo-400' };
    // Offline / off / standby
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', iconColorClass: 'text-muted-foreground', textClass: 'text-muted-foreground' };
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

  // Resistor SVG remains, its color will be dynamic
  const ResistorIcon = ({ className, isActive }: { className?: string, isActive?: boolean }) => {
    const variants = {
      active: { pathLength: [0.9, 1, 0.9], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
      inactive: { pathLength: 1 },
    };
    return (
      <motion.svg viewBox="0 0 24 14" width="36" height="21" className={className}
        initial={false}
        animate={isActive ? "active" : "inactive"}
      >
        <motion.path 
          d="M1 7 H4 L6 11 L10 3 L14 11 L18 3 L20 7 H23" 
          stroke="currentColor" strokeWidth="1.5" fill="none" 
          strokeLinecap="round" strokeLinejoin="round"
          variants={variants}
        />
      </motion.svg>
    );
  };
  
  const isLoadActive = useMemo(() => 
    ['active', 'on', 'nominal'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const isCriticalStatus = useMemo(() => 
    ['fault', 'alarm', 'warning'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );
  
  // Choose a Lucide icon for fault/warning, otherwise use ResistorIcon
  const DisplayIcon = useMemo(() => {
    if (isCriticalStatus) return AlertTriangleIcon;
    return ResistorIcon;
  }, [processedStatus, isCriticalStatus]); // isCriticalStatus included for clarity

  const iconEffectiveColorClass = derivedNodeStyles.color ? '' : statusStyles.iconColorClass;


  // Merge styles: derivedNodeStyles override class-based styles
  const componentStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor,
    backgroundColor: derivedNodeStyles.backgroundColor,
    color: derivedNodeStyles.color, // Affects text if not overridden by textClass
  };
  // The main div classes will handle the defaults if derived styles don't provide them
  const mainDivClasses = `
    sld-node load-node group w-[100px] h-[65px] rounded-lg shadow-md
    flex flex-col items-center justify-between p-1.5
    border-2 ${derivedNodeStyles.borderColor ? '' : statusStyles.borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : statusStyles.bgClass}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;


  return (
    <motion.div
      className={mainDivClasses}
      style={componentStyle}
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

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Power Input"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : statusStyles.textClass}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        <motion.div
          animate={isCriticalStatus ? { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } } : {}}
        >
          <DisplayIcon 
            className={`transition-colors ${iconEffectiveColorClass}`} 
            style={{ color: derivedNodeStyles.color }} 
            // Pass isActive to ResistorIcon if it's the current DisplayIcon
            {...(DisplayIcon === ResistorIcon && { isActive: isLoadActive })} 
          />
        </motion.div>
      </div>
      <p className={`text-[9px] font-medium text-center truncate w-full leading-tight ${derivedNodeStyles.color ? '' : statusStyles.textClass}`} title={`Status: ${processedStatus}`}>
        {String(processedStatus).toUpperCase()}
      </p>
      <p className={`text-[9px] text-center truncate w-full leading-tight ${derivedNodeStyles.color ? '' : statusStyles.textClass}`} title={`Power: ${powerConsumption}`}>
        {powerConsumption}
      </p>
    </motion.div>
  );
};

export default memo(LoadNode);