// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { BreakerNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { ZapOffIcon, ZapIcon, ShieldAlertIcon, ShieldCheckIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, zIndex, dragging } = props; // Using standard NodeProps properties
  const position = (props as any).position;
  const xPos = position?.x ?? 0;
  const yPos = position?.y ?? 0;
  const width = (props as any).width;
  const height = (props as any).height;
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Status DataPointLink Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      // Ensure applyValueMapping can handle various types, including boolean if status is directly represented
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    // Fallback to static status if no DPLink for 'status' or data not available
    return data.status;
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  // --- IsOpen DataPointLink Handling ---
  const isOpenLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isOpen'), [data.dataPointLinks]);
  const isOpenDataPointConfig = useMemo(() => isOpenLink ? dataPoints[isOpenLink.dataPointId] : undefined, [isOpenLink, dataPoints]);
  const isOpenOpcUaNodeId = useMemo(() => isOpenDataPointConfig?.nodeId, [isOpenDataPointConfig]);
  const reactiveIsOpenValue = useOpcUaNodeValue(isOpenOpcUaNodeId);

  const isOpen = useMemo(() => {
    if (isOpenLink && isOpenDataPointConfig && reactiveIsOpenValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsOpenValue, isOpenLink);
      // Interpret various "true" conditions for isOpen
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus or data.config
    return processedStatus === 'open' || (data.config?.normallyOpen && processedStatus !== 'closed');
  }, [isOpenLink, isOpenDataPointConfig, reactiveIsOpenValue, processedStatus, data.config?.normallyOpen]);

  const statusStyles = useMemo(() => {
    let currentStatus = processedStatus; // Use the processed status

    if (currentStatus === 'fault' || currentStatus === 'tripped' || currentStatus === 'alarm') {
      return { border: 'border-destructive dark:border-red-500', bg: 'bg-destructive/10 dark:bg-red-900/30', iconColor: 'text-destructive dark:text-red-400', main: 'text-destructive dark:text-red-400' };
    }
    if (currentStatus === 'warning') {
      return { border: 'border-yellow-500 dark:border-yellow-400', bg: 'bg-yellow-500/10 dark:bg-yellow-900/30', iconColor: 'text-yellow-500 dark:text-yellow-400', main: 'text-yellow-600 dark:text-yellow-400' };
    }
    // Consider 'closed' implies energized/nominal unless specified otherwise by another DPLink
    if (!isOpen && (currentStatus === 'closed' || currentStatus === 'nominal' || currentStatus === 'energized')) {
      return { border: 'border-green-600 dark:border-green-500', bg: 'bg-green-600/10 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-500', main: 'text-green-700 dark:text-green-500' };
    }
    // Default for 'open', 'offline', or undefined status
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-neutral-200/20 dark:bg-neutral-700/30', iconColor: 'text-neutral-500 dark:text-neutral-400', main: 'text-neutral-600 dark:text-neutral-400' };
  }, [processedStatus, isOpen]);

  // --- Derived Styles DataPointLink Handling (Option B approach) ---
  const stylingLinks = useMemo(() => {
    return data.dataPointLinks?.filter(link => 
      ['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || link.targetProperty.startsWith('--')
    ) || [];
  }, [data.dataPointLinks]);

  // Create an object to hold reactive values for styling
  // This is a bit complex due to hooks needing to be top-level.
  // We'll create an array of nodeId-value pairs and then reconstruct the object.
  
  // Step 1: Get all NodeIds for styling links
  const stylingNodeIds = useMemo(() => {
    return stylingLinks.map(link => dataPoints[link.dataPointId]?.nodeId).filter(Boolean) as string[];
  }, [stylingLinks, dataPoints]);

  // Step 2: Subscribe to each nodeId individually. This is not ideal directly.
  // Instead, we will iterate over stylingLinks and get their values within the derivedNodeStyles memo.
  // This means derivedNodeStyles will depend on all individual reactive values if we were to subscribe one by one.

  // Let's try to build the localOpcUaValues object reactively.
  // This requires subscribing to each relevant node ID.
  // The most straightforward way with current hook structure is to call useOpcUaNodeValue for each.
  // This is not scalable if there are many styling links, but for a few, it's manageable.

  // We need a stable list of node IDs to pass to hooks.
  const nodeIdsForDerivedStyles = useMemo(() => {
    return (data.dataPointLinks || [])
      .map(link => dataPoints[link.dataPointId]?.nodeId)
      .filter(nodeId => nodeId !== undefined) as string[];
  }, [data.dataPointLinks, dataPoints]);
  
  // This part is tricky. We can't call useOpcUaNodeValue in a loop.
  // Option B might require a slight modification to how we gather values for getDerivedStyle.
  // If getDerivedStyle absolutely needs the { nodeId: value } map, we have to build it.

  // Let's assume a limited number of style-affecting dataPointLinks, or simplify.
  // For a more robust solution, `useOpcUaNodeValues` (plural) would be needed, or `getDerivedStyle` refactored.

  // Re-approaching Option B for derivedNodeStyles:
  // We need to collect all `reactiveValue`s that `getDerivedStyle` would care about.
  const allRelevantDataPointLinks = useMemo(() => data.dataPointLinks || [], [data.dataPointLinks]);

  // Create a map of opcUaNodeId to its reactive value.
  // This is the tricky part with hooks. We cannot call useOpcUaNodeValue inside a loop or callback.
  // So, we must call useOpcUaNodeValue for *every* dataPointLink's nodeId that *could* be used by getDerivedStyle.

  // Let's simplify: getDerivedStyle iterates dataPointLinks internally.
  // We need to ensure that any value it tries to get from its `opcUaNodeValues` (second param) is reactive.
  // So, the `localOpcUaValues` passed to it must be built from `useOpcUaNodeValue`.

  // Create an array of all nodeIds from data.dataPointLinks
  const allNodeIdsFromLinks = useMemo(() => 
    (data.dataPointLinks || [])
    .map(link => dataPoints[link.dataPointId]?.nodeId)
    .filter(Boolean) as string[]
  , [data.dataPointLinks, dataPoints]);
  
  // This is still problematic as we can't call useOpcUaNodeValue dynamically for `allNodeIdsFromLinks`.

  // Final attempt at Option B for BreakerNode:
  // We have to identify which dataPointLinks are for styling MANUALLY for now or by convention
  // and call useOpcUaNodeValue for them, then pass them.
  // This means `getDerivedStyle` would need to be adapted OR we pass specific values.
  
  // Given the constraints, the most direct way to make `getDerivedStyle` work
  // without changing its signature is to feed it an object of *all* possible
  // OPC UA values it might need. This is what we removed.

  // Let's assume that for BreakerNode, there aren't many (or any) *additional*
  // dataPointLinks used exclusively for `getDerivedStyle` beyond what might already be covered
  // by status, isOpen, etc. If there are, this will be incomplete.

  // The `getDerivedStyle` function takes `opcUaNodeValues` as its second argument.
  // We need to construct this object using our reactive values.
  // For now, we will pass an object containing the reactive values we have already fetched:
  // `reactiveStatusValue` and `reactiveIsOpenValue`.
  // This is an **incomplete** implementation of Option B if other DPLs affect style.

  // Subscriptions for up to 3 dedicated styling links
  const styleLink1 = useMemo(() => stylingLinks[0], [stylingLinks]);
  const styleLink1DataPointConfig = useMemo(() => styleLink1 ? dataPoints[styleLink1.dataPointId] : undefined, [styleLink1, dataPoints]);
  const styleLink1OpcUaNodeId = useMemo(() => styleLink1DataPointConfig?.nodeId, [styleLink1DataPointConfig]);
  const reactiveStyleLink1Value = useOpcUaNodeValue(styleLink1OpcUaNodeId);

  const styleLink2 = useMemo(() => stylingLinks[1], [stylingLinks]);
  const styleLink2DataPointConfig = useMemo(() => styleLink2 ? dataPoints[styleLink2.dataPointId] : undefined, [styleLink2, dataPoints]);
  const styleLink2OpcUaNodeId = useMemo(() => styleLink2DataPointConfig?.nodeId, [styleLink2DataPointConfig]);
  const reactiveStyleLink2Value = useOpcUaNodeValue(styleLink2OpcUaNodeId);

  const styleLink3 = useMemo(() => stylingLinks[2], [stylingLinks]);
  const styleLink3DataPointConfig = useMemo(() => styleLink3 ? dataPoints[styleLink3.dataPointId] : undefined, [styleLink3, dataPoints]);
  const styleLink3OpcUaNodeId = useMemo(() => styleLink3DataPointConfig?.nodeId, [styleLink3DataPointConfig]);
  const reactiveStyleLink3Value = useOpcUaNodeValue(styleLink3OpcUaNodeId);

  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};

    // Add values for primary data points if their nodeIds are defined
    if (statusOpcUaNodeId && reactiveStatusValue !== undefined) {
      values[statusOpcUaNodeId] = reactiveStatusValue;
    }
    if (isOpenOpcUaNodeId && reactiveIsOpenValue !== undefined) {
      values[isOpenOpcUaNodeId] = reactiveIsOpenValue;
    }

    // Add values for dedicated styling links
    if (styleLink1OpcUaNodeId && reactiveStyleLink1Value !== undefined) {
      values[styleLink1OpcUaNodeId] = reactiveStyleLink1Value;
    }
    if (styleLink2OpcUaNodeId && reactiveStyleLink2Value !== undefined) {
      values[styleLink2OpcUaNodeId] = reactiveStyleLink2Value;
    }
    if (styleLink3OpcUaNodeId && reactiveStyleLink3Value !== undefined) {
      values[styleLink3OpcUaNodeId] = reactiveStyleLink3Value;
    }
    // This object now contains reactive values for primary links AND up to 3 styling links.
    // getDerivedStyle will iterate all data.dataPointLinks and use values from this map if the link's nodeId is present.
    return values;
  }, [
    statusOpcUaNodeId, reactiveStatusValue,
    isOpenOpcUaNodeId, reactiveIsOpenValue,
    styleLink1OpcUaNodeId, reactiveStyleLink1Value,
    styleLink2OpcUaNodeId, reactiveStyleLink2Value,
    styleLink3OpcUaNodeId, reactiveStyleLink3Value
  ]);

  const derivedNodeStyles = useMemo(() => {
    return getDerivedStyle(data, opcUaValuesForDerivedStyle, dataPoints);
  }, [data, opcUaValuesForDerivedStyle, dataPoints]);

  
  // Combine statusStyles with derivedNodeStyles. Derived styles can override.
  // For simplicity, we'll focus on className-based statusStyles and let derivedNodeStyles apply inline.
  // More complex merging might be needed if derivedNodeStyles also return classNames.

  const breakerTypeLabel = data.config?.type || 'Breaker';

  // Choose icon based on status - can be expanded with more DPLinks
  const StatusIcon = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'tripped') return ShieldAlertIcon;
    if (processedStatus === 'alarm') return AlertTriangleIcon; // Specific alarm icon
    if (processedStatus === 'warning') return AlertTriangleIcon; // Or a dedicated warning icon
    if (!isOpen && (processedStatus === 'closed' || processedStatus === 'nominal' || processedStatus === 'energized')) return ShieldCheckIcon; // Indicates closed and healthy
    if (isOpen) return ZapOffIcon; // Clearly open
    return ZapIcon; // Default or unknown state icon (could also be ZapOffIcon if default is open)
  }, [processedStatus, isOpen]);


  return (
    <motion.div
      className={`
        sld-node breaker-node group w-[70px] h-[90px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1.5 
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-neutral-900' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      style={derivedNodeStyles} // Apply derived styles here
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover"
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
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

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 !bg-slate-400 !border-slate-500 react-flow__handle-common sld-handle-style" />

      <p className="text-[9px] font-medium text-center truncate w-full mt-0.5" style={{ color: derivedNodeStyles.color || statusStyles.main }} title={`${data.label} (${breakerTypeLabel})`}>
        {data.label}
      </p>
      
      {/* SVG Breaker Symbol or Status Icon */}
      {/* Option 1: Keep SVG and change its state */}
      <motion.svg 
        viewBox="0 0 24 24" 
        width="32" height="32" 
        className={`flex-grow`} 
        style={{ color: derivedNodeStyles.color || statusStyles.iconColor }}
        initial={false} // Prevent initial animation on mount
      >
        <circle cx="12" cy="7" r="2.5" fill="currentColor" /> {/* Top terminal */}
        <circle cx="12" cy="17" r="2.5" fill="currentColor" /> {/* Bottom terminal */}
        <line x1="12" y1="9.5" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1.5" /> {/* Vertical bar */}
        
        {/* Switch arm: using motion.line for smooth transition */}
        <motion.line
          key={isOpen ? "open-arm" : "closed-arm"} // Key change helps React trigger animation correctly
          x1="12"
          y1="12"
          initial={false} // Start from current state if already rendered
          animate={isOpen ? { x2: 18, y2: 8 } : { x2: 12, y2: 9.5 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        <rect x="8" y="11" width="8" height="2" fill="currentColor" className="opacity-60" /> {/* Box body part */}
        
        {/* Contact point: fade in/out */}
        <motion.circle 
          cx="12" cy="12" r="1.5" fill="currentColor"
          initial={{ opacity: isOpen ? 0 : 1 }}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        />
      </motion.svg>
      {/* Option 2: Use Lucide icons (if preferred over dynamic SVG) */}
      {/* <StatusIcon size={32} className={`flex-grow transition-colors ${statusStyles.iconColor}`} style={{ color: derivedNodeStyles.color || statusStyles.iconColor }} /> */}

      <p className="text-[10px] font-semibold" style={{ color: derivedNodeStyles.color || statusStyles.main }}>
        {isOpen ? 'OPEN' : 'CLOSED'}
      </p>

      <p className="text-[9px] text-muted-foreground text-center truncate w-full leading-tight" title={data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel}>
        {data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel.toUpperCase()}
      </p>
    </motion.div>
  );
};
// Add sld-handle-style to your global CSS for common handle visibility etc.
// .sld-handle-style { /* Basic opacity/hover logic already in PanelNode's handle classes */ }

export default memo(BreakerNode);