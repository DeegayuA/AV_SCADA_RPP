// app/circuit/sld/nodes/SwitchNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, getDerivedStyle } from './nodeUtils';
import { InfoIcon, ToggleLeftIcon, ToggleRightIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface SwitchNodeData extends BaseNodeData {
  elementType: SLDElementType.Switch;
  config?: BaseNodeData['config'] & {
    // Specific config for SwitchNode if any in future, e.g., default state
  };
  // The primary state of the switch (on/off) will be driven by a DataPointLink
  // with targetProperty 'isOn' (convention) or a generic 'value'.
}

const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, zIndex, dragging } = props;
  const position = (props as any).position;
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

  // --- IsOn State DataPointLink Handling ---
  // Convention: The switch state is controlled by a DPL targeting 'isOn' or 'value'
  const stateLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'isOn' || link.targetProperty === 'value') ||
    // Fallback if no specific targetProperty, take the first link if available
    (data.dataPointLinks?.length === 1 ? data.dataPointLinks[0] : undefined),
    [data.dataPointLinks]
  );

  const stateDataPointConfig = useMemo(() => stateLink ? dataPoints[stateLink.dataPointId] : undefined, [stateLink, dataPoints]);
  const stateOpcUaNodeId = useMemo(() => stateDataPointConfig?.nodeId, [stateDataPointConfig]);
  const reactiveStateValue = useOpcUaNodeValue(stateOpcUaNodeId); // Subscribe to OPC UA node if ID exists

  const isOn = useMemo(() => {
    if (stateLink && stateDataPointConfig && reactiveStateValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveStateValue, stateLink);
      // Interpret various "true" conditions
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || String(mappedValue).toLowerCase() === 'on' || Number(mappedValue) !== 0;
    }
    // Fallback: if no DPL or value, assume 'off' or a configured default
    return false; 
  }, [stateLink, stateDataPointConfig, reactiveStateValue]);

  // --- Derived Styles ---
  // Using a simplified version for derived styles, similar to BreakerNode
  const stylingLinks = useMemo(() => {
    return data.dataPointLinks?.filter(link => 
      link !== stateLink && (['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || link.targetProperty.startsWith('--'))
    ) || [];
  }, [data.dataPointLinks, stateLink]);

  // For simplicity, this example won't implement multiple reactive style links like BreakerNode.
  // It will rely on getDerivedStyle to use non-reactive values or the main stateLink's value if relevant.
  // A more complete implementation would use multiple useOpcUaNodeValue hooks for styling DPLs.
  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    if (stateOpcUaNodeId && reactiveStateValue !== undefined) {
      values[stateOpcUaNodeId] = reactiveStateValue;
    }
    // Add other reactive style values here if implemented
    return values;
  }, [stateOpcUaNodeId, reactiveStateValue]);
  
  const derivedNodeStyles = useMemo(() => {
    return getDerivedStyle(data, dataPoints, opcUaValuesForDerivedStyle);
  }, [data, dataPoints, opcUaValuesForDerivedStyle]);

  const statusStyles = useMemo(() => {
    if (isOn) {
      return { border: 'border-green-600 dark:border-green-500', bg: 'bg-green-600/10 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-500', main: 'text-green-700 dark:text-green-500' };
    }
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-neutral-200/20 dark:bg-neutral-700/30', iconColor: 'text-neutral-500 dark:text-neutral-400', main: 'text-neutral-600 dark:text-neutral-400' };
  }, [isOn]);

  const SwitchIcon = isOn ? ToggleRightIcon : ToggleLeftIcon;

  return (
    <motion.div
      className={`
        sld-node switch-node group w-[70px] h-[70px] rounded-lg shadow-md
        flex flex-col items-center justify-center p-1.5 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      style={derivedNodeStyles}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      onDoubleClick={() => {
        if (!isEditMode) {
           const fullNodeObject: CustomNodeType = {
                id, type, position: { x: xPos, y: yPos }, data, selected, 
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
                id, type, position: { x: xPos, y: yPos }, data, selected, 
                dragging, zIndex, width: width === null ? undefined : width, 
                height: height === null ? undefined : height, connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />

      <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" style={{ color: derivedNodeStyles.color || statusStyles.main }} title={data.label}>
        {data.label || 'Switch'}
      </p>
      
      <SwitchIcon size={30} className={`flex-grow transition-colors ${statusStyles.iconColor}`} style={{ color: derivedNodeStyles.color || statusStyles.iconColor }} />

      <p className="text-[10px] font-semibold" style={{ color: derivedNodeStyles.color || statusStyles.main }}>
        {isOn ? 'ON' : 'OFF'}
      </p>
    </motion.div>
  );
};

export default memo(SwitchNode);
