// components/sld/nodes/TransformerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { TransformerNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { GitBranchPlusIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Placeholder, ideally custom SVG. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const TransformerNode: React.FC<NodeProps<TransformerNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props; // Adjusted destructuring
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
    return data.status || 'offline'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  // Example: Displaying temperature or load percentage if linked
  const additionalInfo = useMemo(() => {
    const tempLink = data.dataPointLinks?.find(link => link.targetProperty === 'temperature');
    if (tempLink && dataPoints && dataPoints[tempLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[tempLink.dataPointId];
      const rawValue = getDataPointValue(tempLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, tempLink);
      return `Temp: ${formatDisplayValue(mappedValue, tempLink.format, dpMeta?.dataType)}`;
    }
    const loadLink = data.dataPointLinks?.find(link => link.targetProperty === 'loadPercentage');
    if (loadLink && dataPoints && dataPoints[loadLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[loadLink.dataPointId];
      const rawValue = getDataPointValue(loadLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, loadLink);
      return `Load: ${formatDisplayValue(mappedValue, loadLink.format, dpMeta?.dataType)}`;
    }
    return `${data.config?.primaryVoltage || 'HV'}/${data.config?.secondaryVoltage || 'LV'}`;
  }, [data.dataPointLinks, data.config, opcUaNodeValues, dataPoints]);


  const statusStyles = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', symbolColorClass: 'text-destructive', textClass: 'text-destructive-foreground' };
    if (processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', symbolColorClass: 'text-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-300' };
    if (processedStatus === 'nominal' || processedStatus === 'energized' || processedStatus === 'online') 
      return { borderClass: 'border-teal-500', bgClass: 'bg-teal-500/10', symbolColorClass: 'text-teal-500 dark:text-teal-400', textClass: 'text-teal-700 dark:text-teal-300' };
    // Default for offline, standby
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', symbolColorClass: 'text-muted-foreground', textClass: 'text-muted-foreground' };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

  const isTransformerEnergized = useMemo(() => 
    ['nominal', 'energized', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );
  
  const isCriticalStatus = useMemo(() => 
    ['fault', 'alarm', 'warning'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const TransformerSymbolSVG = ({ className, isEnergized }: {className?: string, isEnergized?: boolean}) => {
    const coilVariants = {
      energized: { opacity: [0.7, 1, 0.7], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
      offline: { opacity: 1 },
    };
    return (
      <motion.svg viewBox="0 0 24 24" width="32" height="32" className={className} initial={false}>
        <motion.circle 
          cx="8" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
        />
        <motion.circle 
          cx="16" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" 
          variants={coilVariants} animate={isEnergized ? "energized" : "offline"}
          transition={{ ...coilVariants.energized.transition, delay: 0.5 }} // Offset animation for second coil
        />
        <line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="12.5" y1="7" x2="12.5" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </motion.svg>
    );
  };

  const DisplayIcon = useMemo(() => {
    if (isCriticalStatus) return AlertTriangleIcon;
    return TransformerSymbolSVG;
  }, [processedStatus, isCriticalStatus]); // Dependencies updated
  
  const iconEffectiveColorClass = derivedNodeStyles.color ? '' : statusStyles.symbolColorClass;

  const mainDivClasses = `
    sld-node transformer-node group w-[80px] h-[85px] rounded-lg shadow-lg
    flex flex-col items-center justify-between p-1.5
    border-2 ${derivedNodeStyles.borderColor ? '' : statusStyles.borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : statusStyles.bgClass}
    bg-card dark:bg-neutral-800 
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
  `;
  const textEffectiveClass = derivedNodeStyles.color ? '' : statusStyles.textClass;


  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Apply all derived styles; specific properties can be overridden by classes if needed
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

      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Primary"/>
      <Handle type="source" position={Position.Bottom} id="secondary_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Secondary"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${textEffectiveClass}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        <motion.div
          animate={isCriticalStatus && DisplayIcon === AlertTriangleIcon ? { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } } : {}}
        >
          <DisplayIcon 
            className={`transition-colors ${iconEffectiveColorClass}`} 
            style={{ color: derivedNodeStyles.color || '' }} // Apply derived color to icon if present
            // Pass isEnergized to TransformerSymbolSVG if it's the current DisplayIcon
            {...(DisplayIcon === TransformerSymbolSVG && { isEnergized: isTransformerEnergized })}
          />
        </motion.div>
      </div>
      
      <p className={`text-[8px] text-center truncate w-full leading-tight ${textEffectiveClass}`} title={additionalInfo}>
        {additionalInfo}
      </p>
    </motion.div>
  );
};

export default memo(TransformerNode);