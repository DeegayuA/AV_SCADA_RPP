// components/sld/nodes/GridNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GridNodeData, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ArrowDownToLineIcon, ZapIcon, AlertTriangleIcon, PowerOffIcon } from 'lucide-react'; // For grid connection

const GridNode: React.FC<NodeProps<GridNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser, realtimeData, dataPoints } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    realtimeData: state.realtimeData,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints[statusLink.dataPointId] && realtimeData) {
      const rawValue = getDataPointValue(statusLink.dataPointId, realtimeData);
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'online'; // Default to online
  }, [data.dataPointLinks, data.status, realtimeData, dataPoints]);

  const displayInfo = useMemo(() => {
    // Try to display voltage or frequency if linked
    const voltageLink = data.dataPointLinks?.find(link => link.targetProperty === 'voltage');
    if (voltageLink && dataPoints[voltageLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[voltageLink.dataPointId];
      const rawValue = getDataPointValue(voltageLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, voltageLink);
      return formatDisplayValue(mappedValue, voltageLink.format, dpMeta?.dataType);
    }
    const freqLink = data.dataPointLinks?.find(link => link.targetProperty === 'frequency');
     if (freqLink && dataPoints[freqLink.dataPointId] && realtimeData) {
      const dpMeta = dataPoints[freqLink.dataPointId];
      const rawValue = getDataPointValue(freqLink.dataPointId, realtimeData);
      const mappedValue = applyValueMapping(rawValue, freqLink);
      return formatDisplayValue(mappedValue, freqLink.format, dpMeta?.dataType);
    }
    return data.config?.voltageLevel || 'Grid';
  }, [data.dataPointLinks, data.config?.voltageLevel, realtimeData, dataPoints]);


  const { borderClass, bgClass, iconColorClass, textClass, Icon } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', iconColorClass: 'text-destructive', textClass: 'text-destructive-foreground', Icon: AlertTriangleIcon };
    if (processedStatus === 'disconnected' || processedStatus === 'offline') 
      return { borderClass: 'border-neutral-500', bgClass: 'bg-neutral-500/10', iconColorClass: 'text-neutral-500', textClass: 'text-muted-foreground', Icon: PowerOffIcon };
    // Connected / nominal / online
    return { borderClass: 'border-sky-600 dark:border-sky-500', bgClass: 'bg-sky-600/10 dark:bg-sky-900/20', iconColorClass: 'text-sky-600 dark:text-sky-400', textClass: 'text-sky-700 dark:text-sky-300', Icon: ZapIcon };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, realtimeData, dataPoints),
    [data, realtimeData, dataPoints]
  );

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