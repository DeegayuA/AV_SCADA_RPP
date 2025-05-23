// components/sld/nodes/GeneratorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GeneratorNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ZapIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, CogIcon, PowerIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const GeneratorNode: React.FC<NodeProps<GeneratorNodeData>> = (props) => {
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
    return data.status || 'offline'; // Default status
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const powerOutput = useMemo(() => {
    const powerLink = data.dataPointLinks?.find(
      link => link.targetProperty === 'powerOutput' || link.targetProperty === 'activePower'
    );
    if (powerLink && dataPoints && dataPoints[powerLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const dpMeta = dataPoints[powerLink.dataPointId];
      const rawValue = getDataPointValue(powerLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, dpMeta?.dataType);
    }
    return data.config?.ratingKVA ? `${data.config.ratingKVA} kVA (rated)` : 'N/A';
  }, [data.dataPointLinks, data.config?.ratingKVA, opcUaNodeValues, dataPoints]);

  interface StatusInfo {
    StatusIcon: typeof CogIcon;
    statusText: string;
    statusClasses: string;
    animationClass: string;
  }

  const { StatusIcon, statusText, statusClasses, animationClass } = useMemo<StatusInfo>((): StatusInfo => {
    let icon = CogIcon;
    let text = String(processedStatus).toUpperCase();
    let sClasses = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';
    let animClass = '';

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        sClasses = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'WARNING';
        sClasses = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'running': case 'producing': case 'online':
        icon = CheckCircleIcon; text = (processedStatus === 'producing' || processedStatus === 'online') ? "PROD" : "RUN";
        sClasses = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; 
        animClass = 'animate-pulse'; break;
      case 'starting':
        icon = CogIcon; text = 'STARTING';
        sClasses = 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'; 
        animClass = 'animate-spin'; break;
      case 'stopping':
        icon = CogIcon; text = 'STOPPING';
        sClasses = 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'; 
        animClass = 'animate-spin animation-direction-reverse'; break;
      case 'offline': case 'standby':
        icon = PowerIcon; text = String(processedStatus).toUpperCase();
        sClasses = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-80'; break;
      default: // Unknown status
        icon = ZapIcon; text = text || 'UNKNOWN';
        sClasses = 'border-gray-400 bg-gray-400/10 text-gray-500'; break;
    }
    return { StatusIcon: icon, statusText: text, statusClasses: sClasses, animationClass };
  }, [processedStatus]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

  // Generator Symbol SVG (Circle with 'G' or Sine Wave)
  const GeneratorSymbolSVG = ({ className, isSpinning }: {className?: string, isSpinning?: boolean}) => {
    const variants = {
      spinning: { rotate: 360 },
      still: { rotate: 0 },
    };
    const transition = isSpinning ? { loop: Infinity, ease: "linear", duration: 5 } : { duration: 0.5 };

    return (
      <motion.svg 
        viewBox="0 0 24 24" 
        width="32" 
        height="32" 
        className={className}
        variants={variants}
        animate={isSpinning ? "spinning" : "still"}
        transition={transition}
      >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <text x="12" y="16" fontSize="12" textAnchor="middle" fontWeight="bold" fill="currentColor">G</text>
          {/* <path d="M6 12 Q9 6 12 12 T18 12" stroke="currentColor" strokeWidth="1.5" fill="none"/> */}
      </motion.svg>
    );
  };

  const isGeneratorRunning = useMemo(() => 
    ['running', 'producing', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  // Merge styles: derivedNodeStyles override class-based styles
  const componentStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor,
    backgroundColor: derivedNodeStyles.backgroundColor,
    color: derivedNodeStyles.color, 
  };
  const mainDivClasses = `
    sld-node generator-node group w-[85px] h-[90px] rounded-lg shadow-lg
    flex flex-col items-center justify-between p-2
    border-2 ${derivedNodeStyles.borderColor ? '' : statusClasses.split(' ')[0]} 
    ${derivedNodeStyles.backgroundColor ? '' : statusClasses.split(' ')[1]}
    ${derivedNodeStyles.color ? '' : statusClasses.split(' ')[2]}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
    ${animationClass && !isGeneratorRunning ? animationClass : ''} 
  `;
  // Apply main animationClass (like pulse for running) to the whole node if not using individual SVG spin for running.
  // Or, remove 'animate-pulse' from statusClasses for 'running' if GeneratorSymbolSVG handles its own spinning.
  // For this example, let's assume GeneratorSymbolSVG's spin is the primary "running" animation.
  // So, we remove 'animate-pulse' from statusClasses if it was there for running state.
  // And the mainDivClasses will use `animationClass` only for non-running transitional states like starting/stopping.

  const iconColorClass = derivedNodeStyles.color ? '' : statusClasses.split(' ')[2];


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

      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      <Handle type="target" position={Position.Top} id="top_control_in" isConnectable={isConnectable} className="!w-2.5 !h-2.5 sld-handle-style !bg-purple-400 !border-purple-500" title="Control/Fuel"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : 'text-foreground dark:text-neutral-200'}`} title={data.label}>
        {data.label}
      </p>
      
      <div className="my-0.5 pointer-events-none">
        <GeneratorSymbolSVG className={`transition-colors ${iconColorClass}`} isSpinning={isGeneratorRunning} />
      </div>
      
      <div className="flex items-center justify-center gap-1 mt-0.5" style={{ color: derivedNodeStyles.color }}>
        <StatusIcon size={10} className={`${iconColorClass} ${animationClass && (StatusIcon === CogIcon || StatusIcon === XCircleIcon || StatusIcon === AlertTriangleIcon || StatusIcon === PowerIcon) ? animationClass : ''}`} />
        <p className={`text-[9px] font-medium text-center truncate leading-tight ${iconColorClass}`}>
          {statusText}
        </p>
      </div>
      <p className={`text-[9px] leading-none ${derivedNodeStyles.color ? '' : 'text-muted-foreground/90'}`} title={`Power: ${powerOutput}`}>
          {powerOutput}
      </p>
    </motion.div>
  );
};

export default memo(GeneratorNode);