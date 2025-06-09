// components/sld/nodes/BatteryNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BatteryNodeData, CustomNodeType, SLDElementType } from '@/types/sld';

interface ExtendedNodeProps extends NodeProps<BatteryNodeData> {
  xPos: number;
  yPos: number;
  width?: number | null;
  height?: number | null;
}

import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    formatDisplayValue,
    getStandardNodeState,
    getNodeAppearanceFromState,
} from './nodeUtils';
import { InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

const BatteryNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging, width, height } = props;
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Removed globalOpcUaNodeValues as it's not directly used here
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive Data Point Handling ---
  // STATUS
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  // SOC
  const socLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'soc'), [data.dataPointLinks]);
  const socDataPointConfig = useMemo(() => socLink ? dataPoints[socLink.dataPointId] : undefined, [socLink, dataPoints]);
  const socOpcUaNodeId = useMemo(() => socDataPointConfig?.nodeId, [socDataPointConfig]);
  const reactiveSocValue = useOpcUaNodeValue(socOpcUaNodeId);

  // POWER FLOW (New)
  const powerFlowLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerFlow'), [data.dataPointLinks]);
  const powerFlowDataPointConfig = useMemo(() => powerFlowLink ? dataPoints[powerFlowLink.dataPointId] : undefined, [powerFlowLink, dataPoints]);
  const powerFlowOpcUaNodeId = useMemo(() => powerFlowDataPointConfig?.nodeId, [powerFlowDataPointConfig]);
  const reactivePowerFlowValue = useOpcUaNodeValue(powerFlowOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'idle';
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const socPercent = useMemo(() => {
    if (socLink && socDataPointConfig && reactiveSocValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveSocValue, socLink);
      const formatted = formatDisplayValue(mappedValue, socLink.format, socDataPointConfig?.dataType);
      const numericVal = parseFloat(formatted);
      return isNaN(numericVal) ? null : numericVal;
    }
    return typeof data.config?.soc === 'number' ? data.config.soc : null;
  }, [socLink, socDataPointConfig, reactiveSocValue, data.config?.soc]);

  const processedPowerFlow = useMemo((): number | null => { // New: Process power flow
    if (powerFlowLink && powerFlowDataPointConfig && reactivePowerFlowValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerFlowValue, powerFlowLink);
      // Ensure format options like type 'number' are considered by formatDisplayValue
      const formatted = formatDisplayValue(mappedValue, powerFlowLink.format, powerFlowDataPointConfig?.dataType);
      const numericVal = parseFloat(formatted);
      return isNaN(numericVal) ? null : numericVal; // Expects negative for charge, positive for discharge
    }
    return null; // No power flow data
  }, [powerFlowLink, powerFlowDataPointConfig, reactivePowerFlowValue]);
  
  const batteryAction = useMemo((): 'CHARGING' | 'DISCHARGING' | 'IDLE' | null => {
    const statusLower = String(processedStatus).toLowerCase();
    if (statusLower === 'charging') return 'CHARGING';
    if (statusLower === 'discharging') return 'DISCHARGING';
    
    // If status is generic (idle, ok, standby, etc.), use powerFlow to determine action
    if (['idle', 'standby', 'nominal', 'ok', 'online', 'connected', 'enabled', 'active'].includes(statusLower)) {
        if (processedPowerFlow !== null) {
            if (processedPowerFlow < -1) return 'CHARGING'; // Power flows into battery (negative)
            if (processedPowerFlow > 1) return 'DISCHARGING'; // Power flows out of battery (positive)
        }
        return 'IDLE'; // Default to IDLE if power is near zero or no power data
    }
    return null; // Unknown action if status doesn't imply one and power not definitive
  }, [processedStatus, processedPowerFlow]);
  
  const standardNodeState = useMemo(() => {
    // Pass processedPowerFlow as the powerValue (3rd argument)
    return getStandardNodeState(processedStatus, null, processedPowerFlow !== null ? processedPowerFlow > 0 : null, data.status, null, batteryAction, socPercent);
  }, [processedStatus, processedPowerFlow, data.status, batteryAction, socPercent]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Battery), [standardNodeState]);
  
  const displaySoc = socPercent !== null ? `${Math.round(socPercent)}%` : 'N/A';

  const displayStatusText = useMemo(() => {
    if (standardNodeState === 'FAULT_VERY_LOW_SOC') return "CRITICAL LOW SOC";
    if (standardNodeState === 'WARNING_LOW_SOC') return "LOW SOC";
    if (standardNodeState === 'CHARGING') return "CHARGING";
    if (standardNodeState === 'DISCHARGING') return "DISCHARGING";
    if (standardNodeState === 'IDLE_BATTERY') return "IDLE";
    if (standardNodeState === 'FAULT') return "FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    return processedStatus ? String(processedStatus).replace(/_/g, ' ').toUpperCase() : standardNodeState.replace(/_/g, ' ');
  },[standardNodeState, processedStatus]);


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

  const numBatteryModules = data.config?.numModules || 3;

  return (
    <motion.div
      className={`
        sld-node battery-node group custom-node-hover w-[80px] h-[110px] rounded-lg shadow-lg 
        flex flex-col items-center justify-start 
        border-2 
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}
      `}
      style={{
        borderColor: appearance.borderColorVar,
      }}
      initial="initial"
      animate={{ scale: selected && isNodeEditable ? 1.03 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: isNodeEditable ? 1.03 : (selected ? 1 : 1.01) }}
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
        className={`node-content-wrapper flex flex-col items-center justify-between p-1 w-full h-full rounded-md 
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{ 
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full px-1" title={data.label} style={{ color: appearance.textColorVar }}>
          {data.label}
        </p>
        
        <motion.div
          className="relative w-[44px] h-[50px] my-0.5"
          animate={
            standardNodeState === 'CHARGING' ? { y: [0, -1.5, 0, 1.5, 0] } : {}
          }
          transition={
            standardNodeState === 'CHARGING' ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : {}
          }
        >
          <div className="absolute inset-0 border-2 rounded-sm bg-neutral-200/30 dark:bg-neutral-700/30"
               style={{ borderColor: 'var(--sld-color-border-subtle, #9ca3af)' }}>
          </div>

          <motion.div
            className="absolute bottom-0 left-0 w-full rounded-b-sm"
            style={{
              backgroundColor: appearance.iconColorVar,
            }}
            initial={{ height: '0%' }}
            animate={{ height: `${socPercent ?? 0}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex justify-around items-end gap-px p-0.5">
            {[...Array(Math.max(1, numBatteryModules))].map((_, i) => (
              <div 
                key={i} 
                className="w-full h-full bg-transparent border-x"
                style={{ 
                  borderColor: 'rgba(120, 120, 120, 0.25)'
                }}
              />
            ))}
          </div>
          
          <div 
            className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[calc(100%-10px)] h-[4px] rounded-t-sm"
            style={{ backgroundColor: 'var(--sld-color-border-subtle, #9ca3af)' }}
          />
        </motion.div>
        
        <p 
          className="text-[10px] font-bold text-center leading-tight" 
          title={`SOC: ${displaySoc}`} 
          style={{ color: appearance.mainStatusColorVar }}
        >
          {displaySoc}
        </p>
        <p 
          className="text-[9px] font-medium text-center truncate w-full px-1 leading-tight" 
          title={`Status: ${displayStatusText}`} 
          style={{ color: appearance.statusTextColorVar }}
        >
          {displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(BatteryNode);