// components/sld/nodes/BatteryNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { BatteryNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld'; // Added SLDElementType
interface ExtendedNodeProps extends NodeProps<BatteryNodeData> {
  xPos: number;
  yPos: number;
  width?: number | null;
  height?: number | null;
}

import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    // getDataPointValue, // May not be needed if status is simple enough
    applyValueMapping,
    formatDisplayValue,
    // getDerivedStyle, // To be replaced
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import { InfoIcon } from 'lucide-react'; // Keep InfoIcon for button
import { Button } from "@/components/ui/button";

const BatteryNode: React.FC<ExtendedNodeProps> = (props) => {
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
    return data.status || 'idle';
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const socPercent = useMemo(() => { // Renamed from socValue for clarity
    if (socLink && socDataPointConfig && reactiveSocValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveSocValue, socLink);
      const formatted = formatDisplayValue(mappedValue, socLink.format, socDataPointConfig?.dataType);
      const numericVal = parseFloat(formatted); // Handles "50%" -> 50
      return isNaN(numericVal) ? null : numericVal;
    }
    return typeof data.config?.soc === 'number' ? data.config.soc : null;
  }, [socLink, socDataPointConfig, reactiveSocValue, data.config?.soc]);

  const batteryAction = useMemo((): 'CHARGING' | 'DISCHARGING' | 'IDLE' | null => {
    const statusLower = String(processedStatus).toLowerCase();
    if (statusLower === 'charging') return 'CHARGING';
    if (statusLower === 'discharging') return 'DISCHARGING';
    if (statusLower === 'idle' || statusLower === 'standby' || statusLower === 'nominal' || statusLower === 'ok' || statusLower === 'online') return 'IDLE';
    return null; // Unknown action if status doesn't imply one
  }, [processedStatus]);
  
  const standardNodeState = useMemo(() => {
    return getStandardNodeState(processedStatus, null, null, data.status, null, batteryAction, socPercent);
  }, [processedStatus, data.status, batteryAction, socPercent]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Battery), [standardNodeState]);
  const IconComponent = useMemo(() => appearance.icon, [appearance.icon]);
  const sldAccentVar = 'var(--sld-color-accent)';

  const displaySoc = socPercent !== null ? `${Math.round(socPercent)}%` : (processedStatus || 'N/A');

  const displayStatusText = useMemo(() => { // For text display, can be more descriptive
    if (standardNodeState === 'FAULT_VERY_LOW_SOC') return "CRITICAL LOW SOC";
    if (standardNodeState === 'WARNING_LOW_SOC') return "LOW SOC";
    if (standardNodeState === 'CHARGING') return "CHARGING";
    if (standardNodeState === 'DISCHARGING') return "DISCHARGING";
    if (standardNodeState === 'IDLE_BATTERY') return "IDLE";
    if (standardNodeState === 'FAULT') return "FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    return standardNodeState.replace(/_/g, ' ');
  },[standardNodeState]);


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
      className={`
        sld-node battery-node group custom-node-hover w-[75px] h-[85px] rounded-xl shadow-lg
        flex flex-col items-center justify-between
        border-2
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}
      `}
      style={{
        borderColor: appearance.borderColorVar,
      }}
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
                data, selected, dragging, zIndex, 
                width: width === null ? undefined : width, 
                height: height === null ? undefined : height, 
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3" style={{ color: 'var(--sld-color-text-muted)'}} />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in_charge" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="Charge Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out_discharge" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="Discharge Output"/>
      <Handle type="source" position={Position.Left} id="left_dc_bus" isConnectable={isConnectable} className="sld-handle-style !-ml-1" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="DC Bus"/>
      <Handle type="source" position={Position.Right} id="right_dc_bus" isConnectable={isConnectable} className="sld-handle-style !-mr-1" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }} title="DC Bus"/>

      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-2 w-full h-full rounded-md
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{ 
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label} style={{ color: appearance.textColorVar }}>
          {data.label}
        </p>
        
        <motion.div
          className="my-1"
          animate={standardNodeState === 'DISCHARGING' ? { opacity: [1, 0.7, 1] } :
                   (standardNodeState === 'CHARGING' ? {y: [0, -1, 0, 1, 0]} : {})}
          transition={
            standardNodeState === 'DISCHARGING' ? { duration: 2, repeat: Infinity, ease: "easeInOut" } :
            standardNodeState === 'CHARGING' ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}
          }
        >
          <IconComponent
            size={30} 
            className={`transition-colors`}
            style={{ color: appearance.iconColorVar }}
            strokeWidth={1.8} // Consistent stroke width for battery icons
          />
        </motion.div>
        
        <p className="text-[9px] font-medium text-center truncate w-full leading-tight" title={`Status: ${displayStatusText}`} style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
        <p className="text-[10px] font-bold text-center" title={`SOC: ${displaySoc}`} style={{ color: appearance.mainStatusColorVar }}>
          {displaySoc}
        </p>
      </div>
    </motion.div>
  );
};
export default memo(BatteryNode);