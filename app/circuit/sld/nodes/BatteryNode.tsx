// components/sld/nodes/BatteryNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { BatteryNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType

// Extended props interface to include additional properties used in the component
interface ExtendedNodeProps extends NodeProps<BatteryNodeData> {
  xPos: number;
  yPos: number;
  width?: number | null;
  height?: number | null;
}

import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { BatteryChargingIcon, BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, AlertCircleIcon, ZapIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const BatteryNode: React.FC<ExtendedNodeProps> = (props) => { // Using ExtendedNodeProps that includes width and height
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props; // Adjusted destructuring
import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

// Extended props interface to include additional properties used in the component
interface ExtendedNodeProps extends NodeProps<BatteryNodeData> {
  xPos: number;
  yPos: number;
  width?: number | null;
  height?: number | null;
}

import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { BatteryChargingIcon, BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, AlertCircleIcon, ZapIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const BatteryNode: React.FC<ExtendedNodeProps> = (props) => { // Using ExtendedNodeProps that includes width and height
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

  const socLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'soc'), [data.dataPointLinks]);
  const socDataPointConfig = useMemo(() => socLink ? dataPoints[socLink.dataPointId] : undefined, [socLink, dataPoints]);
  const socOpcUaNodeId = useMemo(() => socDataPointConfig?.nodeId, [socDataPointConfig]);
  const reactiveSocValue = useOpcUaNodeValue(socOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'idle'; // Default to idle
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const socValue = useMemo(() => {
    if (socLink && socDataPointConfig && reactiveSocValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveSocValue, socLink);
      // parseFloat will handle cases where formatDisplayValue might return "50%" -> 50
      const formatted = formatDisplayValue(mappedValue, socLink.format, socDataPointConfig?.dataType);
      const numericVal = parseFloat(formatted);
      return isNaN(numericVal) ? -1 : numericVal; // Return -1 if parsing fails
    }
    return typeof data.config?.soc === 'number' ? data.config.soc : -1; // Fallback to config
  }, [socLink, socDataPointConfig, reactiveSocValue, data.config?.soc]);

  const { icon: StatusIcon, borderClass, bgClass, textClass, animationClass } = useMemo(() => {
    let animClass = '';
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { icon: AlertCircleIcon, borderClass: 'border-destructive', bgClass: 'bg-destructive/10', textClass: 'text-destructive', animationClass: animClass };
    if (processedStatus === 'warning') 
      return { icon: AlertCircleIcon, borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', animationClass: animClass };

    if (processedStatus === 'charging') {
      animClass = 'animate-pulse'; // Pulse for charging state (applied to icon)
      return { icon: BatteryChargingIcon, borderClass: 'border-sky-500', bgClass: 'bg-sky-500/10', textClass: 'text-sky-500', animationClass: animClass };
    }
    if (processedStatus === 'discharging') {
      // Discharging icon can vary with SOC, specific animation handled by Framer Motion on icon
      if (socValue > 75) return { icon: BatteryFullIcon, borderClass: 'border-green-500', bgClass: 'bg-green-500/10', textClass: 'text-green-500', animationClass: animClass };
      if (socValue > 40) return { icon: BatteryMediumIcon, borderClass: 'border-lime-500', bgClass: 'bg-lime-500/10', textClass: 'text-lime-500', animationClass: animClass };
      if (socValue >= 0) return { icon: BatteryLowIcon, borderClass: 'border-amber-500', bgClass: 'bg-amber-500/10', textClass: 'text-amber-500', animationClass: animClass };
      return { icon: BatteryLowIcon, borderClass: 'border-amber-500', bgClass: 'bg-amber-500/10', textClass: 'text-amber-500', animationClass: animClass };
    }
    
    // Default/Idle state, icon based on SOC
    if (socValue > 75) return { icon: BatteryFullIcon, borderClass: 'border-green-600', bgClass: 'bg-green-600/10', textClass: 'text-green-600', animationClass: animClass};
    if (socValue > 40) return { icon: BatteryMediumIcon, borderClass: 'border-lime-500', bgClass: 'bg-lime-500/10', textClass: 'text-lime-500', animationClass: animClass};
    if (socValue >= 0 && socValue <=40) return { icon: BatteryLowIcon, borderClass: 'border-amber-500', bgClass: 'bg-amber-500/10', textClass: 'text-amber-500', animationClass: animClass};
      
    return { icon: ZapIcon, borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', animationClass: animClass }; 
  }, [processedStatus, socValue]);
  
  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (socOpcUaNodeId && reactiveSocValue !== undefined) {
      primaryOpcUaValues[socOpcUaNodeId] = reactiveSocValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, socOpcUaNodeId, reactiveSocValue, globalOpcUaNodeValues]);

  const displaySoc = socValue >= 0 ? `${Math.round(socValue)}%` : (processedStatus || 'N/A');

  // Merge styles: derivedNodeStyles can override class-based styles
  const componentStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor, // Let className handle if undefined
    backgroundColor: derivedNodeStyles.backgroundColor, // Let className handle if undefined
    color: derivedNodeStyles.color, // Let className handle if undefined for text
  };
  // Icon color can be specifically set by derived styles or fallback to textClass
  const iconFinalColor = derivedNodeStyles.color || ''; // textClass will apply if this is empty

  return (
    <motion.div
      className={`
        sld-node battery-node group w-[75px] h-[85px] rounded-xl shadow-lg
        flex flex-col items-center justify-between p-2 
        border-2 ${derivedNodeStyles.borderColor ? '' : borderClass} ${derivedNodeStyles.backgroundColor ? '' : bgClass}
        bg-card dark:bg-neutral-800
        transition-all duration-200
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
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

      {/* Handles */}
      <Handle type="target" position={Position.Top} id="top_in_charge" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Charge Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out_discharge" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Discharge Output"/>
      <Handle type="source" position={Position.Left} id="left_dc_bus" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1" title="DC Bus"/>
      <Handle type="source" position={Position.Right} id="right_dc_bus" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1" title="DC Bus"/>

      <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : textClass}`} title={data.label}>
        {data.label}
      </p>
      
      <motion.div
        animate={processedStatus === 'discharging' ? { opacity: [1, 0.7, 1] } : {}}
        transition={processedStatus === 'discharging' ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <StatusIcon 
          size={30} 
          className={`my-1 transition-colors ${iconFinalColor ? '' : textClass} ${animationClass}`} 
          style={{ color: iconFinalColor }} 
        />
      </motion.div>
      
      <p className={`text-[9px] font-medium text-center truncate w-full leading-tight ${derivedNodeStyles.color ? '' : textClass}`} title={`Status: ${processedStatus}`}>
        {String(processedStatus).toUpperCase()}
      </p>
      <p className={`text-[10px] font-bold text-center ${derivedNodeStyles.color ? '' : textClass}`} title={`SOC: ${displaySoc}`}>
        {displaySoc}
      </p>
    </motion.div>
  );
};
export default memo(BatteryNode);