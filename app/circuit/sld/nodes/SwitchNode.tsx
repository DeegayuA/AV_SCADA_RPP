// app/circuit/sld/nodes/SwitchNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    // getDerivedStyle, // To be replaced
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
import { InfoIcon } from 'lucide-react'; // Keep InfoIcon for button
import { Button } from "@/components/ui/button";

export interface SwitchNodeData extends BaseNodeData {
  elementType: SLDElementType.Switch;
  config?: BaseNodeData['config'] & {
    // Specific config for SwitchNode if any in future, e.g., default state
  };
}

const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, zIndex, dragging } = props;
  const position = (props as any).position; // Cast to any to access position if not in NodeProps type
  const xPos = position?.x ?? 0;
  const yPos = position?.y ?? 0;
  const width = (props as any).width;
  const height = (props as any).height;

  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    dataPoints: state.dataPoints,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const stateLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'isOn' || link.targetProperty === 'value') ||
    (data.dataPointLinks?.length === 1 ? data.dataPointLinks[0] : undefined),
    [data.dataPointLinks]
  );

  const stateDataPointConfig = useMemo(() => stateLink ? dataPoints[stateLink.dataPointId] : undefined, [stateLink, dataPoints]);
  const stateOpcUaNodeId = useMemo(() => stateDataPointConfig?.nodeId, [stateDataPointConfig]);
  const reactiveStateValue = useOpcUaNodeValue(stateOpcUaNodeId);

  const isOn = useMemo(() => {
    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveStateValue, stateLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || String(mappedValue).toLowerCase() === 'on' || Number(mappedValue) !== 0;
    }
    return false; 
  }, [stateLink, stateDataPointConfig, reactiveStateValue]);
  
  const processedStatusForStateFn = useMemo(() => { // Determine a general status for getStandardNodeState
    // This can be enhanced if SwitchNode has its own 'status' DPLink for fault/warning
    if (data.status) return String(data.status).toLowerCase();
    return isOn ? 'active' : 'off'; // Default to active/off based on isOn state
  }, [data.status, isOn]);

  const standardNodeState = useMemo(() => {
    // A Switch being "ON" means it's closed, "OFF" means it's open.
    // Assume "energized" for styling if it's ON (closed), "de-energized" if OFF (open).
    const isEnergizedAssumption = isOn;
    return getStandardNodeState(processedStatusForStateFn, isEnergizedAssumption, !isOn, data.status);
  }, [processedStatusForStateFn, isOn, data.status]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Switch), [standardNodeState]);
  const IconComponent = useMemo(() => appearance.icon, [appearance.icon]);
  const sldAccentVar = 'var(--sld-color-accent)';

  const displayStatusText = useMemo(() => { // ON / OFF text
    return isOn ? 'ON' : 'OFF';
  }, [isOn]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevIsOnRef = useRef(isOn);

  useEffect(() => {
    if (prevIsOnRef.current !== isOn) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700);
      prevIsOnRef.current = isOn;
      return () => clearTimeout(timer);
    }
  }, [isOn]);

  return (
    <motion.div
      className={`
        sld-node switch-node group custom-node-hover w-[70px] h-[70px] rounded-lg shadow-md
        flex flex-col items-center justify-center
        border-2
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}
      `}
      style={{
        borderColor: appearance.borderColorVar,
        opacity: data.opacity,
        ringColor: selected ? sldAccentVar : 'transparent',
      }}
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onDoubleClick={() => {
        if (!isEditMode) {
           const fullNodeObject: CustomNodeType = {
                id, type: type as SLDElementType, position: { x: xPos, y: yPos }, data, selected,
                dragging, zIndex, width: width === null ? undefined : width, 
                height: height === null ? undefined : height, connectable: isConnectable,
            };
          setSelectedElementForDetails(fullNodeObject);
        }
      }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
             const fullNodeObject: CustomNodeType = {
                id, type: type as SLDElementType, position: { x: xPos, y: yPos }, data, selected,
                dragging, zIndex, width: width === null ? undefined : width, 
                height: height === null ? undefined : height, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3" style={{ color: 'var(--sld-color-text-muted)'}} />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      
      <div className={`
          node-content-wrapper flex flex-col items-center justify-center p-1.5 w-full h-full rounded-sm 
          ${isRecentStatusChange ? 'animate-status-highlight' : ''}
        `}
        style={{ 
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" title={data.label} style={{color: appearance.textColorVar}}>
          {data.label || 'Switch'}
        </p>
        
        <AnimatePresence mode="wait">
            <motion.div
                key={standardNodeState} // Key ensures re-render if icon changes
                initial={{ opacity:0, scale:0.7 }}
                animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0, scale:0.7, transition:{duration:0.1} }}
                transition={{type:'spring', stiffness:250, damping:15, duration: 0.15}}
                className="my-1 flex-grow flex items-center justify-center"
            >
                <IconComponent
                    size={30}
                    className={`transition-colors`}
                    style={{ color: appearance.iconColorVar }}
                    strokeWidth={1.8}
                />
            </motion.div>
        </AnimatePresence>

        <p className="text-[10px] font-semibold" style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(SwitchNode);
