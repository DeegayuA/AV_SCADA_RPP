// components/sld/nodes/MotorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
// Added CustomNodeData to the import line
import { BaseNodeData, CustomNodeType, CustomNodeData, DataPointLink, DataPoint, SLDElementType } from '@/types/sld'; // Added CustomNodeType, SLDElementType and CustomNodeData
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { CogIcon, PlayCircleIcon, PauseCircleIcon, AlertCircleIcon, XCircleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface MotorNodeData extends BaseNodeData { 
    elementType: SLDElementType.Motor; // Use the correct SLDElementType
    config?: BaseNodeData['config'] & {
        ratedPowerkW?: number;
        voltage?: string;
        phase?: 1 | 3;
    }
}

const MotorNode: React.FC<NodeProps<MotorNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging, xPos, yPos } = props; // Fixed destructuring
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
    return data.status || 'stopped'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const powerDisplay = useMemo(() => {
    const powerLink = data.dataPointLinks?.find(link => link.targetProperty === 'powerConsumption' || link.targetProperty === 'activePower');
    if (powerLink && dataPoints && dataPoints[powerLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
        const dpMeta = dataPoints[powerLink.dataPointId];
        const rawValue = getDataPointValue(powerLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
        const mappedValue = applyValueMapping(rawValue, powerLink);
        return formatDisplayValue(mappedValue, powerLink.format, dpMeta?.dataType);
    }
    return data.config?.ratedPowerkW ? `${data.config.ratedPowerkW}kW` : 'N/A';
  }, [data.dataPointLinks, data.config?.ratedPowerkW, opcUaNodeValues, dataPoints]);


  const { StatusIcon, statusText, baseClasses, isSpinning } = useMemo(() => {
    let icon = CogIcon;
    let text = String(processedStatus).toUpperCase();
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';
    let spinning = false;

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm': case 'tripped':
        icon = XCircleIcon; text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertCircleIcon; text = 'WARNING';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'running':
        icon = PlayCircleIcon; text = 'RUNNING'; spinning = true;
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'stopped': case 'offline': case 'off':
        icon = PauseCircleIcon; text = 'STOPPED';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500'; break;
      default: // Unknown or other statuses
        icon = CogIcon; text = text || 'UNKNOWN';
        classes = 'border-gray-400 bg-gray-400/10 text-gray-500'; break;
    }
    return { StatusIcon: icon, statusText: text, baseClasses: classes, isSpinning: spinning };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaNodeValues), // Fixed parameter order to match function definition
    [data, dataPoints, opcUaNodeValues]
  );
  
  const MotorSymbolSVG = ({ className, isSpinning }: { className?: string, isSpinning?: boolean }) => {
    const variants = {
      spinning: { rotate: 360 },
      still: { rotate: 0 },
    };
    const transition = isSpinning ? { loop: Infinity, ease: "linear", duration: 2 } : { duration: 0.5 }; // Faster spin than generator

    return (
      <motion.svg 
        viewBox="0 0 24 24" width="30" height="30" 
        className={className}
        variants={variants}
        animate={isSpinning ? "spinning" : "still"}
        transition={transition}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <text x="12" y="16.5" fontSize="12" textAnchor="middle" fontWeight="bold" fill="currentColor">M</text>
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node motor-node group w-[75px] h-[85px] rounded-full shadow-lg 
    flex flex-col items-center justify-between p-2
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]}
    ${derivedNodeStyles.color ? '' : baseClasses.split(' ')[2]}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
  `;
  const effectiveIconColorClass = derivedNodeStyles.color ? '' : baseClasses.split(' ')[2];


  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Allow DPLinks to override all styles
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
                position: { x: xPos, y: yPos }, // Construct position from xPos and yPos
                data: data as unknown as CustomNodeData,
                selected, 
                dragging, 
                zIndex,
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_power_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Power Input"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : 'text-foreground dark:text-neutral-200'}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        <MotorSymbolSVG className={`transition-colors ${effectiveIconColorClass}`} isSpinning={isSpinning} />
      </div>
      
      <div className="flex items-center justify-center gap-1 mt-0.5">
         <StatusIcon size={10} className={`${effectiveIconColorClass}`}/>
         <p className={`text-[9px] font-medium text-center truncate leading-tight ${effectiveIconColorClass}`}>
           {statusText}
         </p>
      </div>
      <p className={`text-[9px] leading-none ${derivedNodeStyles.color ? '' : 'text-muted-foreground/90'}`} title={`Power: ${powerDisplay}`}>
          {powerDisplay}
      </p>
    </motion.div>
  );
};

export default memo(MotorNode);