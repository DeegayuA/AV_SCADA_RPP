// components/sld/nodes/IsolatorNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld'; // Added CustomNodeType and SLDElementType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react'; // For fault/warning states. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface IsolatorNodeData extends BaseNodeData {
    elementType: SLDElementType.Isolator;  // Use enum value instead of string literal
    config?: BaseNodeData['config'] & {
        poles?: number;
        loadBreak?: boolean;
    }
}

// Extended node props with additional properties needed for our component
interface ExtendedNodeProps extends NodeProps<IsolatorNodeData> {
  width?: number;
  height?: number;
}

const IsolatorNode: React.FC<ExtendedNodeProps> = (props) => {
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
      const rawValue = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'open'; // Default to open
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const isOpen = useMemo(() => {
    const isOpenLink = data.dataPointLinks?.find(link => link.targetProperty === 'isOpen');
    if (isOpenLink && dataPoints && dataPoints[isOpenLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(isOpenLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
      const mappedValue = applyValueMapping(rawValue, isOpenLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus
    return processedStatus === 'open' || processedStatus === 'isolated';
  }, [data.dataPointLinks, processedStatus, opcUaNodeValues, dataPoints]);


  const { statusText, baseClasses, effectiveColor } = useMemo(() => {
    let text = isOpen ? 'OPEN' : 'CLOSED';
    let classes = isOpen 
        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' 
        : 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400';
    
    if (processedStatus === 'fault' || processedStatus === 'alarm') {
        text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive';
    } else if (processedStatus === 'warning') {
        text = 'WARNING';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
    return { statusText: text, baseClasses: classes, effectiveColor: classes.split(' ')[2] };
  }, [isOpen, processedStatus]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaNodeValues), // Corrected parameter order
    [data, opcUaNodeValues, dataPoints]
  );

  const IsolatorArmSVG = ({ className, isOpen }: { className?: string, isOpen?: boolean }) => {
    const armVariants = {
      open: { rotate: -45, x: -4, y: 4 }, // Adjust x,y for visual pivot
      closed: { rotate: 0, x: 0, y: 0 },
    };
    return (
      <motion.svg viewBox="0 0 10 24" width="12" height="28" 
        className={className} 
        initial={false} 
        animate={isOpen ? "open" : "closed"}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <motion.line 
            x1="5" y1="2" x2="5" y2="22" 
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            variants={armVariants}
            style={{ transformOrigin: "5px 12px" }} // Mid-point of a 24px tall viewbox
        />
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node isolator-node group custom-node-hover w-[50px] h-[70px] rounded-md shadow-sm
    flex flex-col items-center justify-between /* Padding removed, moved to content wrapper */
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    /* bg-card and specific bgClass removed, moved to content wrapper */
    /* transition-all duration-150 is part of custom-node-hover */
    /* selected ring styles removed */
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
    /* hover:shadow-lg removed */
  `;
  // finalEffectiveColor will be applied to the node-content-wrapper or inherited for elements within it.

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
        ...(derivedNodeStyles.borderColor && { borderColor: derivedNodeStyles.borderColor }),
        ...(derivedNodeStyles.opacity && { opacity: derivedNodeStyles.opacity }),
        // backgroundColor and color are now primarily for the node-content-wrapper
      }}
      // variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation(); // Prevent node selection
            const fullNodeObject: CustomNodeType = {
                id, type, 
                position: { x: xPos, y: yPos }, 
                data: { ...data, elementType: SLDElementType.Isolator } as any, 
                selected, dragging, zIndex, width, height, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}
      
      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div
        className={`node-content-wrapper flex flex-col items-center justify-between pt-1 pb-1.5 px-0.5 w-full h-full rounded-sm
                    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]} /* bg from baseClasses */
                    ${derivedNodeStyles.color ? '' : baseClasses.split(' ')[2]} /* text color from baseClasses */
                    bg-card dark:bg-neutral-800
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          backgroundColor: derivedNodeStyles.backgroundColor || undefined,
          color: derivedNodeStyles.color || effectiveColor, // Use effectiveColor as fallback for text
        }}
      >
        <p className="text-[9px] font-medium text-center truncate w-full leading-none" title={data.label}>
          {data.label} {/* Text color will be inherited */}
        </p>
        
        <div className="flex flex-col items-center my-0.5 pointer-events-none h-[32px] justify-center relative">
           {/* SVG and contact points color will be inherited */}
           <div className="w-1.5 h-1.5 rounded-full absolute top-0" style={{backgroundColor: 'currentColor'}}></div>
           <IsolatorArmSVG className="current-color-class-placeholder" isOpen={isOpen} /> {/* Replace placeholder with actual class if needed or rely on inheritance */}
           <div className="w-1.5 h-1.5 rounded-full absolute bottom-0" style={{backgroundColor: 'currentColor'}}></div>
           {(processedStatus === 'fault' || processedStatus === 'alarm' || processedStatus === 'warning') && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute">
                   <AlertTriangleIcon size={14} className="current-color-class-placeholder" /> {/* Replace placeholder */}
              </motion.div>
           )}
        </div>
        
        <p className="text-[9px] font-bold leading-tight">
          {statusText} {/* Text color will be inherited */}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(IsolatorNode);