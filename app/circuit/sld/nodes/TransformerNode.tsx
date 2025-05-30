// components/sld/nodes/TransformerNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { TransformerNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { GitBranchPlusIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Placeholder, ideally custom SVG. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const TransformerNode: React.FC<NodeProps<TransformerNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging, xPos, yPos } = props; // Fixed destructuring
  const position = { x: xPos, y: yPos }; // Create position object from xPos and yPos
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
      const rawValue = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'offline'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  // Example: Displaying temperature or load percentage if linked
  const additionalInfo = useMemo(() => {
    const tempLink = data.dataPointLinks?.find(link => link.targetProperty === 'temperature');
    if (tempLink && dataPoints && dataPoints[tempLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[tempLink.dataPointId];
      const rawValue = getDataPointValue(tempLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
      const mappedValue = applyValueMapping(rawValue, tempLink);
      return `Temp: ${formatDisplayValue(mappedValue, tempLink.format, dpMeta?.dataType)}`;
    }
    const loadLink = data.dataPointLinks?.find(link => link.targetProperty === 'loadPercentage');
    if (loadLink && dataPoints && dataPoints[loadLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[loadLink.dataPointId];
      const rawValue = getDataPointValue(loadLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
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
    getDerivedStyle(data, dataPoints, opcUaNodeValues), // Correct parameter order
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
    sld-node transformer-node group custom-node-hover w-[80px] h-[85px] rounded-lg shadow-lg
    flex flex-col items-center justify-between /* p-1.5 removed */
    border-2 ${derivedNodeStyles.borderColor ? '' : statusStyles.borderClass} 
    /* bg-card and statusStyles.bgClass removed, moved to content wrapper */
    /* transition-all duration-150 is part of custom-node-hover */
    /* selected ring styles removed */
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
    /* hover:shadow-xl removed */
  `;
  // const textEffectiveClass = derivedNodeStyles.color ? '' : statusStyles.textClass; // Will be applied to content wrapper

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
        borderColor: derivedNodeStyles.borderColor || undefined, // DPL can override border
        opacity: derivedNodeStyles.opacity || undefined,
      }}
      // variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation(); // Prevent node selection
            const fullNodeObject = {
                id, type, 
                position: { x: xPos, y: yPos }, 
                data, selected, dragging, zIndex, connectable: isConnectable,
                // Ensure width and height are passed if available, though not strictly needed by CustomNodeType
                width: (props as any).width, 
                height: (props as any).height,
            };
            setSelectedElementForDetails(fullNodeObject as CustomNodeType);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Handles are outside node-content-wrapper */}
      <Handle type="target" position={Position.Top} id="primary_in" isConnectable={isConnectable} className="sld-handle-style" title="Primary"/>
      <Handle type="source" position={Position.Bottom} id="secondary_out" isConnectable={isConnectable} className="sld-handle-style" title="Secondary"/>

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div className={`
          node-content-wrapper flex flex-col items-center justify-between p-1.5 w-full h-full rounded-sm
          ${derivedNodeStyles.backgroundColor ? '' : statusStyles.bgClass}
          ${derivedNodeStyles.color ? '' : statusStyles.textClass}
          bg-card dark:bg-neutral-800
          ${isRecentStatusChange ? 'animate-status-highlight' : ''}
        `}
        style={{
          backgroundColor: derivedNodeStyles.backgroundColor || undefined, // DPL override for background
          color: derivedNodeStyles.color || undefined, // DPL override for text
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label} {/* Text color will be inherited */}
        </p>
        
        <div className="my-0.5 pointer-events-none">
          <motion.div
            animate={isCriticalStatus && DisplayIcon === AlertTriangleIcon ? { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } } : {}}
          >
            {/* Icon color will be inherited or use iconEffectiveColorClass as fallback if DPL doesn't set text color */}
            <DisplayIcon 
              className={`transition-colors`} 
              style={{ color: derivedNodeStyles.color || iconEffectiveColorClass }}
              {...(DisplayIcon === TransformerSymbolSVG && { isEnergized: isTransformerEnergized })}
            />
          </motion.div>
        </div>
        
        <p className="text-[8px] text-center truncate w-full leading-tight" title={additionalInfo}>
          {additionalInfo} {/* Text color will be inherited */}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(TransformerNode);