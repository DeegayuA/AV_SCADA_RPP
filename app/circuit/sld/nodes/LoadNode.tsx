// components/sld/nodes/LoadNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { LoadNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ArrowRightToLineIcon, SlidersHorizontalIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Arrow for load consumption. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const LoadNode: React.FC<NodeProps<LoadNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props; // Destructure all needed props
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
    return data.status || 'off'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const powerConsumption = useMemo(() => {
    const powerLink = data.dataPointLinks?.find(
      link => link.targetProperty === 'powerConsumption' || link.targetProperty === 'power'
    );
    if (powerLink && dataPoints && dataPoints[powerLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[powerLink.dataPointId];
      const rawValue = getDataPointValue(powerLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, dpMeta?.dataType);
    }
    return data.config?.ratedPowerkW ? `${data.config.ratedPowerkW}kW (rated)` : (data.config?.loadType || 'Load');
  }, [data.dataPointLinks, data.config, opcUaNodeValues, dataPoints]);

  const statusStyles = useMemo(() => {
    // Base styles on processedStatus
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', iconColorClass: 'text-destructive', textClass: 'text-destructive-foreground' };
    if (processedStatus === 'overload' || processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', iconColorClass: 'text-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-300' };
    if (processedStatus === 'active' || processedStatus === 'on' || processedStatus === 'nominal') 
      return { borderClass: 'border-indigo-500', bgClass: 'bg-indigo-500/10', iconColorClass: 'text-indigo-500', textClass: 'text-indigo-600 dark:text-indigo-400' };
    // Offline / off / standby
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', iconColorClass: 'text-muted-foreground', textClass: 'text-muted-foreground' };
  }, [processedStatus]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

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
                id, type, position, data, selected, dragging, zIndex, width, height,
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