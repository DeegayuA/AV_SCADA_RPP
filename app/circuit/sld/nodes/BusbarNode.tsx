// components/sld/nodes/BusbarNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps as ReactFlowNodeProps, Handle, Position } from 'reactflow'; // Importing as ReactFlowNodeProps
import { motion } from 'framer-motion';
import { BusbarNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    // getDataPointValue, // May not be needed if status is simple
    applyValueMapping,
    // getDerivedStyle, // To be replaced
    formatDisplayValue,
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import { InfoIcon } from 'lucide-react'; // Keep InfoIcon for button
import { Button } from "@/components/ui/button";

// Extended NodeProps with position property
interface NodeProps<T = any> extends ReactFlowNodeProps<T> {
  position: { x: number; y: number };
  width?: number;
  height?: number;
}

const BusbarNode: React.FC<NodeProps<BusbarNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, zIndex, dragging, position } = props;
  const xPos = position?.x ?? 0;
  const yPos = position?.y ?? 0;
  const width = props.width ?? null;
  const height = props.height ?? null;
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

  const voltageLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'voltage'), [data.dataPointLinks]);
  const voltageDataPointConfig = useMemo(() => voltageLink ? dataPoints[voltageLink.dataPointId] : undefined, [voltageLink, dataPoints]);
  const voltageOpcUaNodeId = useMemo(() => voltageDataPointConfig?.nodeId, [voltageDataPointConfig]);
  const reactiveVoltageValue = useOpcUaNodeValue(voltageOpcUaNodeId);
  // --- End Reactive Data Point Handling ---

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'de-energized'; // Default status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const isEnergized = useMemo(() => {
    const upperStatus = processedStatus?.toUpperCase();
    return upperStatus === 'ENERGIZED' || upperStatus === 'NOMINAL';
  }, [processedStatus]);

  const standardNodeState = useMemo(() => getStandardNodeState(processedStatus, isEnergized), [processedStatus, isEnergized]);
  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);
  const sldAccentVar = 'var(--sld-color-accent)';

  // Display voltage or other info if linked, this can remain as is or also use appearance.textColorVar
  const displayInfo = useMemo(() => {
    if (voltageLink && voltageDataPointConfig && reactiveVoltageValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveVoltageValue, voltageLink);
      return formatDisplayValue(mappedValue, voltageLink.format, voltageDataPointConfig?.dataType);
    }
    return data.label; // Fallback to label if no specific info DPLink
  }, [voltageLink, voltageDataPointConfig, reactiveVoltageValue, data.label]);


  // Dimensions for a horizontal busbar by default
  const busbarWidth = data.config?.width || 150; // Allow config override
  const busbarHeight = data.config?.height || 12;

  const mainDivClasses = `
    sld-node busbar-node group custom-node-hover
    rounded shadow-sm 
    flex items-center justify-center relative
    border-2
    ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
  `;

  // node-content-wrapper is now the busbar itself for busbar node.
  const busbarVisualClasses = `node-content-wrapper w-full h-full rounded-sm transition-colors duration-300`;

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState); // Track standard state

  useEffect(() => {
    if (prevStatusRef.current !== standardNodeState) { // Track standard state
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
        width: `${busbarWidth}px`,
        height: `${busbarHeight}px`,
        borderColor: appearance.borderColorVar,
        '--tw-ring-color': selected ? sldAccentVar : 'transparent',
      }}
      initial="initial"
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      whileHover={{ scale: isNodeEditable ? 1.02 : 1.01 }} // Subtle hover
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full z-20 bg-background/70 hover:bg-secondary/90 p-0.5"
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
          <InfoIcon className="h-3 w-3" style={{ color: 'var(--sld-color-text-muted)'}} />
        </Button>
      )}

      <div
        className={`${busbarVisualClasses} ${isRecentStatusChange ? 'animate-status-highlight' : ''}`}
        style={{ backgroundColor: appearance.mainStatusColorVar }}
      />

      {/* Handles */}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`top-${pos}`} type="target" position={Position.Top} id={`top-${pos * 100}`}
          style={{ left: `${pos * 100}%`, background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}
          isConnectable={isConnectable}
          className="sld-handle-style"
        />
      ))}
      {[0.25, 0.5, 0.75].map(pos => (
        <Handle
          key={`bottom-${pos}`} type="source" position={Position.Bottom} id={`bottom-${pos * 100}`}
          style={{ left: `${pos * 100}%`, background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}
          isConnectable={isConnectable}
          className="sld-handle-style"
        />
      ))}
      <Handle
        type="target" position={Position.Left} id="left" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}
      />
      <Handle
        type="source" position={Position.Right} id="right" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}
      />

      {(displayInfo || data.label) && (
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center pointer-events-none"
          style={{ width: `${busbarWidth * 1.2}px` }}
        >
          <p className="text-[9px] font-medium truncate"
            style={{ color: appearance.textColorVar }}
            title={displayInfo || data.label}
          >
            {displayInfo || data.label}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default memo(BusbarNode);