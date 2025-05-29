// components/sld/nodes/GenericDeviceNode.tsx
import React, { memo, useMemo, useState, useEffect } from 'react'; // Added useState, useEffect
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { GenericDeviceNodeData, CustomNodeType, DataPoint } from '@/types/sld'; // Added CustomNodeType, DataPoint
import { useAppStore } from '@/stores/appStore';
import { BoxIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, InfoIcon, PowerIcon } from 'lucide-react'; // Default icon, Added InfoIcon, PowerIcon
import { Button } from "@/components/ui/button"; // Added Button
import { Input } from "@/components/ui/input"; // Added Input for editable label
import { getDataPointValue, applyValueMapping, formatDisplayValue } from './nodeUtils'; // Added imports

const GenericDeviceNode: React.FC<NodeProps<GenericDeviceNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails, updateNodeConfig } = useAppStore(state => ({ // Added updateNodeConfig
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
    updateNodeConfig: state.updateNodeConfig, // Added from store
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // State for editable label
  const [editingLabel, setEditingLabel] = useState(data.label);
  // State for operational status
  const [currentOperationalStatus, setCurrentOperationalStatus] = useState<'on' | 'off'>(data.config?.operationalStatus === 'on' ? 'on' : 'off');

  // Update local state if node data changes from upstream
  useEffect(() => {
    setEditingLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    setCurrentOperationalStatus(data.config?.operationalStatus === 'on' ? 'on' : 'off');
  }, [data.config?.operationalStatus]);


  const handleLabelChange = (newLabel: string) => {
    setEditingLabel(newLabel);
    // PROPAGATION: This is where you would call a function to update the node's data in the central store.
    // For example: updateNodeData(id, { ...data, label: newLabel });
    // For this subtask, we'll use updateNodeConfig from appStore to simulate.
    if (updateNodeConfig) {
       updateNodeConfig(id, { ...data.config }, { ...data, label: newLabel }); // Spreading config and then passing new data
    }
    console.log(`Label updated for node ${id}: ${newLabel}`);
  };

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLabelChange((event.target as HTMLInputElement).value);
      (event.target as HTMLInputElement).blur(); // Lose focus
    } else if (event.key === 'Escape') {
      setEditingLabel(data.label); // Revert to original label
      (event.target as HTMLInputElement).blur(); // Lose focus
    }
  };
  
  const handleToggleOperationalStatus = () => {
    const newStatus = currentOperationalStatus === 'on' ? 'off' : 'on';
    setCurrentOperationalStatus(newStatus);
    // PROPAGATION: Update central store
    // For example: updateNodeData(id, { ...data, config: { ...data.config, operationalStatus: newStatus } });
    if (updateNodeConfig) {
      updateNodeConfig(id, { ...data.config, operationalStatus: newStatus });
    }
    console.log(`Operational status for node ${id} toggled to: ${newStatus}`);
  };

  const linkedDataValues = useMemo(() => {
    if (!data.dataPointLinks || !opcUaNodeValues || !dataPoints) {
      return [];
    }
    return data.dataPointLinks.map(link => {
      const dpMeta = dataPoints[link.dataPointId] as DataPoint | undefined;
      const label = dpMeta?.label || dpMeta?.name || link.dataPointId;
      const rawValue = getDataPointValue(link.dataPointId, dataPoints, opcUaNodeValues);
      const mappedValue = applyValueMapping(rawValue, link);
      const formattedValue = formatDisplayValue(mappedValue, link.format, dpMeta?.dataType);
      return {
        label: label,
        value: formattedValue,
        key: `${link.dataPointId}-${link.targetProperty}` // Ensure unique key if multiple links point to same DP
      };
    }).filter(item => item.value !== undefined && item.value !== null && item.value !== '-'); // Filter out empty/default values
  }, [data.dataPointLinks, opcUaNodeValues, dataPoints]);

  // Choose icon based on status or config.iconName (more complex logic needed for iconName mapping)
  const { StatusIcon, statusText, styleClasses } = useMemo(() => {
    let icon = BoxIcon;
    let text = data.status || 'Unknown';
    let baseClasses = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';

    // Start with base styling
    let determinedClasses = baseClasses;

    // Determine status-based styling
    switch (data.status) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        determinedClasses = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'Warning';
        determinedClasses = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'nominal': case 'running': case 'active': case 'online':
        icon = CheckCircleIcon; text = data.status?.toUpperCase() || 'ONLINE';
        determinedClasses = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'offline':
        icon = BoxIcon; text = 'Offline';
        determinedClasses = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-70'; break;
    }

    // Override with operationalStatus if 'off'
    if (currentOperationalStatus === 'off') {
      icon = PowerIcon; // Or a more specific "off" icon like BoxIcon or XCircleIcon if preferred
      text = 'OFF';
      determinedClasses = 'border-neutral-600 bg-neutral-700/30 text-neutral-400 opacity-60';
    }
    
    // Future: if (data.config?.iconName) { icon = mapIconName(data.config.iconName); }
    return { StatusIcon: icon, statusText: text, styleClasses: determinedClasses };
  }, [data.status, data.config?.iconName, currentOperationalStatus]); // Added currentOperationalStatus dependency
  
  const deviceTypeDisplay = data.config?.deviceType || 'Device';
  const firmwareVersion = data.config?.firmwareVersion;

  return (
    <motion.div
      className={`
        sld-node generic-device-node group w-[90px] h-[110px] rounded-lg shadow-md relative {/* Increased height slightly */}
        flex flex-col items-center justify-start p-1.5 
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
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
                position: { x: xPos, y: yPos }, // Construct position from xPos and yPos
                data, 
                selected, 
                dragging, 
                zIndex,
                connectable: isConnectable,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Generic devices often have both input and output */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Output"/>
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" title="Side Input"/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" title="Side Output"/>

      {isNodeEditable ? (
        <Input
          type="text"
          value={editingLabel}
          onChange={(e) => setEditingLabel(e.target.value)}
          onBlur={(e) => handleLabelChange(e.target.value)}
          onKeyDown={handleLabelKeyDown}
          className="text-[9px] font-semibold text-center truncate w-full h-5 p-0.5 border-0 focus-visible:ring-1 focus-visible:ring-primary bg-transparent hover:bg-muted/50"
          placeholder="Node Label"
          onClick={(e) => e.stopPropagation()} // Prevent node selection/drag start when clicking input
        />
      ) : (
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {editingLabel} {/* Display state version for consistency, it updates from data.label via useEffect */}
        </p>
      )}
      
      <StatusIcon size={20} className="my-0.5 transition-colors" />
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight" title={statusText}>
        {statusText} {/* Display dynamic status text */}
      </p>
      
      <p className="text-[8px] text-muted-foreground text-center truncate w-full leading-tight mb-0.5" title={deviceTypeDisplay}>
        {deviceTypeDisplay}
      </p>

      {firmwareVersion && (
        <p className="text-[7px] text-muted-foreground/80 text-center truncate w-full leading-tight" title={`Firmware: ${firmwareVersion}`}>
          FW: {firmwareVersion}
        </p>
      )}

      {isNodeEditable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-0.5 left-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleOperationalStatus();
          }}
          title={`Toggle Status (Current: ${currentOperationalStatus === 'on' ? 'ON' : 'OFF'})`}
        >
          <PowerIcon className={`h-3 w-3 ${currentOperationalStatus === 'on' ? 'text-green-500' : 'text-red-500'}`} />
        </Button>
      )}

      {linkedDataValues.length > 0 && (
        <div className="data-display-area mt-0.5 w-full text-left text-[7px] overflow-y-auto max-h-[20px] px-0.5"> {/* Adjusted max-h */}
          {linkedDataValues.map(item => (
            <div key={item.key} className="flex justify-between items-center leading-tight">
              <span className="truncate flex-1 mr-0.5" title={item.label}>{item.label}:</span>
              <span className="font-semibold truncate max-w-[45%]" title={item.value}>{item.value}</span> {/* Adjusted max-w */}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default memo(GenericDeviceNode);