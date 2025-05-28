// components/sld/nodes/GridNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { GridNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ArrowDownToLineIcon, ZapIcon, AlertTriangleIcon, PowerOffIcon, InfoIcon } from 'lucide-react'; // For grid connection. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const GridNode: React.FC<NodeProps<GridNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type } = props; // Using only standard NodeProps properties
  // Access additional properties needed for details view via type assertion
  const { position, dragging, zIndex } = props as any;
  const xPos = position?.x;
  const yPos = position?.y;
  const width = (props as any).width;
  const height = (props as any).height;
import { useOpcUaNodeValue } from '@/stores/appStore'; // Import useOpcUaNodeValue

const GridNode: React.FC<NodeProps<GridNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type } = props;
  const { position, dragging, zIndex } = props as any;
  const xPos = position?.x;
  const yPos = position?.y;
  const width = (props as any).width;
  const height = (props as any).height;
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

  // For displayInfo, prioritize voltage, then frequency
  const voltageLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'voltage'), [data.dataPointLinks]);
  const voltageDataPointConfig = useMemo(() => voltageLink ? dataPoints[voltageLink.dataPointId] : undefined, [voltageLink, dataPoints]);
  const voltageOpcUaNodeId = useMemo(() => voltageDataPointConfig?.nodeId, [voltageDataPointConfig]);
  const reactiveVoltageValue = useOpcUaNodeValue(voltageOpcUaNodeId);

  const freqLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'frequency'), [data.dataPointLinks]);
  const freqDataPointConfig = useMemo(() => freqLink ? dataPoints[freqLink.dataPointId] : undefined, [freqLink, dataPoints]);
  const freqOpcUaNodeId = useMemo(() => freqDataPointConfig?.nodeId, [freqDataPointConfig]);
  const reactiveFreqValue = useOpcUaNodeValue(freqOpcUaNodeId);
  // --- End Reactive Data Point Handling ---

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'online'; // Default to online
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const displayInfo = useMemo(() => {
    if (voltageLink && voltageDataPointConfig && reactiveVoltageValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveVoltageValue, voltageLink);
      return formatDisplayValue(mappedValue, voltageLink.format, voltageDataPointConfig?.dataType);
    }
    if (freqLink && freqDataPointConfig && reactiveFreqValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveFreqValue, freqLink);
      return formatDisplayValue(mappedValue, freqLink.format, freqDataPointConfig?.dataType);
    }
    return data.config?.voltageLevel || 'Grid';
  }, [voltageLink, voltageDataPointConfig, reactiveVoltageValue, freqLink, freqDataPointConfig, reactiveFreqValue, data.config?.voltageLevel]);

  const { borderClass, bgClass, iconColorClass, textClass, Icon } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', iconColorClass: 'text-destructive', textClass: 'text-destructive-foreground', Icon: AlertTriangleIcon };
    if (processedStatus === 'disconnected' || processedStatus === 'offline') 
      return { borderClass: 'border-neutral-500', bgClass: 'bg-neutral-500/10', iconColorClass: 'text-neutral-500', textClass: 'text-muted-foreground', Icon: PowerOffIcon };
    return { borderClass: 'border-sky-600 dark:border-sky-500', bgClass: 'bg-sky-600/10 dark:bg-sky-900/20', iconColorClass: 'text-sky-600 dark:text-sky-400', textClass: 'text-sky-700 dark:text-sky-300', Icon: ZapIcon };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => {
    const primaryOpcUaValues: Record<string, string | number | boolean> = {};
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      primaryOpcUaValues[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (voltageOpcUaNodeId && reactiveVoltageValue !== undefined) { // Prioritize voltage for styling if linked
      primaryOpcUaValues[voltageOpcUaNodeId] = reactiveVoltageValue;
    } else if (freqOpcUaNodeId && reactiveFreqValue !== undefined) { // Then frequency
      primaryOpcUaValues[freqOpcUaNodeId] = reactiveFreqValue;
    }
    return getDerivedStyle(data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues);
  }, [data, dataPoints, statusOpcUaNodeId, reactiveStatusValue, voltageOpcUaNodeId, reactiveVoltageValue, freqOpcUaNodeId, reactiveFreqValue, globalOpcUaNodeValues]);

  const mainDivClasses = `
    sld-node grid-node group w-[120px] h-[60px] rounded-lg shadow-md
    flex flex-col items-center justify-center p-2 
    border-2 ${derivedNodeStyles.borderColor ? '' : borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : bgClass}
    bg-card dark:bg-neutral-800 
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;
  const effectiveIconColor = derivedNodeStyles.color || iconColorClass;
  const effectiveTextColor = derivedNodeStyles.color || textClass;


  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles}
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

      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Grid Output"/>
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Grid Input (Bidirectional)"/>

      <div className="flex items-center justify-center pointer-events-none">
        <Icon size={22} className={`mr-2 transition-colors`} style={{color: effectiveIconColor}} />
        {/* Optional second icon, e.g. for flow direction, could also be data-driven */}
        { (processedStatus === 'online' || processedStatus === 'connected') && 
            <ArrowDownToLineIcon size={18} className={`opacity-70 transition-colors`} style={{color: effectiveIconColor}} />
        }
      </div>
      <p className={`text-[10px] font-semibold text-center truncate w-full mt-1 ${effectiveTextColor}`} title={data.label}>
        {data.label}
      </p>
      <p className={`text-[8px] leading-none ${effectiveTextColor}`} title={displayInfo}>
        {displayInfo}
      </p>
    </motion.div>
  );
};

export default memo(GridNode);