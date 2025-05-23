// components/sld/nodes/IsolatorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react'; // For fault/warning states. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface IsolatorNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        poles?: number;
        loadBreak?: boolean;
    }
}

const IsolatorNode: React.FC<NodeProps<IsolatorNodeData>> = (props) => {
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
    return data.status || 'open'; // Default to open
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const isOpen = useMemo(() => {
    const isOpenLink = data.dataPointLinks?.find(link => link.targetProperty === 'isOpen');
    if (isOpenLink && dataPoints && dataPoints[isOpenLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(isOpenLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
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
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
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
    sld-node isolator-node group w-[50px] h-[70px] rounded-md shadow-sm
    flex flex-col items-center justify-between pt-1 pb-1.5 px-0.5
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const finalEffectiveColor = derivedNodeStyles.color || effectiveColor;

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Derived styles can override all aspects
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
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

      <p className={`text-[9px] font-medium text-center truncate w-full leading-none ${derivedNodeStyles.color ? '' : 'text-foreground dark:text-neutral-200'}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="flex flex-col items-center my-0.5 pointer-events-none h-[32px] justify-center relative">
         <div className={`w-1.5 h-1.5 rounded-full absolute top-0`} style={{backgroundColor: finalEffectiveColor}}></div> {/* Top contact */}
         <IsolatorArmSVG className={`${finalEffectiveColor}`} isOpen={isOpen} />
         <div className={`w-1.5 h-1.5 rounded-full absolute bottom-0`} style={{backgroundColor: finalEffectiveColor}}></div> {/* Bottom contact */}
         {(processedStatus === 'fault' || processedStatus === 'alarm' || processedStatus === 'warning') && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute">
                 <AlertTriangleIcon size={14} className={finalEffectiveColor} />
            </motion.div>
         )}
      </div>
      
      <p className={`text-[9px] font-bold leading-tight ${finalEffectiveColor}`}>
        {statusText}
      </p>
    </motion.div>
  );
};

export default memo(IsolatorNode);