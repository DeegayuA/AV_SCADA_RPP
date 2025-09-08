// components/sld/nodes/LoadNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { LoadNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    // getDataPointValue, // May not be directly needed if status is simple
    applyValueMapping,
    formatDisplayValue,
    // getDerivedStyle, // To be replaced
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import { InfoIcon } from 'lucide-react'; // Keep InfoIcon for button
import { Button } from "@/components/ui/button";

// Extend NodeProps with the additional properties needed
interface ExtendedNodeProps extends NodeProps<LoadNodeData> {
  xPos: number;
  yPos: number;
  width?: number;
  height?: number;
}

const LoadNode: React.FC<ExtendedNodeProps> = (props) => {
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

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerConsumption' || link.targetProperty === 'power'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'off'; // Default status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const powerConsumption = useMemo(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      // Use powerLink.format for specific formatting if available
      const formatToUse = powerLink.format || { type: 'number', precision: 1, suffix: 'kW' }; // Default format
      return formatDisplayValue(mappedValue, formatToUse, powerDataPointConfig?.dataType);
    }
    return data.config?.ratedPowerkW ? `${data.config.ratedPowerkW}kW (rated)` : (data.config?.loadType || 'Load');
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config]);
  
  const isLoadActive = useMemo(() => 
    ['active', 'on', 'nominal', 'energized'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const standardNodeState = useMemo(() => {
    // Map component's specific logic to the standardized states
    const statusUpper = processedStatus?.toUpperCase();
    if (statusUpper === 'FAULT' || statusUpper === 'ALARM' || statusUpper === 'OVERLOAD') return 'FAULT'; // Treat OVERLOAD as FAULT for now
    if (statusUpper === 'WARNING') return 'WARNING';

    // Use isLoadActive to determine energized/de-energized states
    if (isLoadActive) return 'ENERGIZED';
    else return 'DEENERGIZED'; // Covers 'off', 'offline', 'standby', 'idle' etc.

  }, [processedStatus, isLoadActive]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);
  const IconComponent = useMemo(() => appearance.icon, [appearance.icon]); // Get icon component from appearance
  const sldAccentVar = 'var(--sld-color-accent)';

  const displayStatusText = useMemo(() => 
    typeof processedStatus === 'string' ? processedStatus : String(processedStatus),
    [processedStatus]
  );

  const isCriticalStatus = useMemo(() => 
    standardNodeState === 'FAULT' || standardNodeState === 'WARNING',
    [standardNodeState]
  );

  const mainDivClasses = `
    sld-node load-node group custom-node-hover w-[100px] h-[65px] rounded-lg shadow-md
    flex flex-col items-center justify-between
    border-2
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
  `;

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState);

  useEffect(() => {
    if (prevStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700);
      prevStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);
  
  return (
    <motion.div
      className={`${mainDivClasses} ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}`}
      style={{
        borderColor: appearance.borderColorVar,
        opacity: (data as any).opacity || 1, // Safe access with default value
        '--tw-ring-color': selected ? sldAccentVar : 'transparent',
      } as any}
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1.01 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, type, 
                position: { x: xPos, y: yPos }, 
                data, selected, dragging, zIndex, width, height, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3" style={{ color: 'var(--sld-color-text-muted)'}} />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="Power Input"/>

      <div
        className={`node-content-wrapper flex flex-col items-center justify-between p-1.5 w-full h-full rounded-md
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label} style={{ color: appearance.textColorVar }}>
          {data.label}
        </p>
        
        <div className="my-0.5 pointer-events-none">
          <motion.div
            animate={isCriticalStatus ? { scale: [1, 1.05, 1], transition: { duration: 1.5, repeat: Infinity } } : {}}
          >
            <IconComponent
              className="transition-colors" 
              style={{ color: appearance.iconColorVar }}
              size={28} // Standardized size, adjust as needed
              strokeWidth={isCriticalStatus ? 2.2 : 1.8}
            />
          </motion.div>
        </div>
        <p className="text-[9px] font-medium text-center truncate w-full leading-tight" title={`Status: ${displayStatusText}`} style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
        <p className="text-[9px] text-center truncate w-full leading-tight" title={`Power: ${powerConsumption}`} style={{ color: appearance.statusTextColorVar }}>
          {powerConsumption}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(LoadNode);