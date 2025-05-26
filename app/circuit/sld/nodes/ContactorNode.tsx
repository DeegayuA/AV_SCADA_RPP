// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { ContactorNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { PowerIcon, PowerOffIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props; // Removed width and height
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Changed realtimeData to opcUaNodeValues
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Changed
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(statusLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'open'; // Default to open
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);
  
  const isClosed = useMemo(() => {
     // Prefer a DataPointLink for 'isClosed' if available for direct boolean control
    const isClosedLink = data.dataPointLinks?.find(link => link.targetProperty === 'isClosed');
    if (isClosedLink && dataPoints && dataPoints[isClosedLink.dataPointId] && opcUaNodeValues) { // Added dataPoints and opcUaNodeValues checks
      const rawValue = getDataPointValue(isClosedLink.dataPointId, opcUaNodeValues, dataPoints); // Pass all three
      const mappedValue = applyValueMapping(rawValue, isClosedLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || Number(mappedValue) === 1;
    }
    // Fallback logic based on processedStatus
    return processedStatus === 'closed' || processedStatus === 'energized';
  }, [data.dataPointLinks, processedStatus, opcUaNodeValues, dataPoints]);


  const { borderClass, bgClass, textClass, Icon } = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') 
      return { borderClass: 'border-destructive', bgClass: 'bg-destructive/10', textClass: 'text-destructive', Icon: AlertTriangleIcon };
    if (processedStatus === 'warning') 
      return { borderClass: 'border-yellow-500', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-500', Icon: AlertTriangleIcon };
    if (isClosed) 
      return { borderClass: 'border-green-600', bgClass: 'bg-green-600/10', textClass: 'text-green-600', Icon: PowerIcon };
    // Open or default (offline, standby)
    return { borderClass: 'border-neutral-400 dark:border-neutral-600', bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', Icon: PowerOffIcon };
  }, [processedStatus, isClosed]);
  
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, opcUaNodeValues, dataPoints), // Changed realtimeData to opcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );
  
  const contactorSymbolColor = derivedNodeStyles.color || textClass; // Use derived color or fallback to status text color

  // Combine classes and styles
  const mainDivClasses = `
    sld-node contactor-node group w-[60px] h-[80px] rounded-md shadow-md
    flex flex-col items-center justify-between p-1
    border-2 ${derivedNodeStyles.borderColor ? '' : borderClass} 
    ${derivedNodeStyles.backgroundColor ? '' : bgClass}
    bg-card dark:bg-neutral-800
    transition-all duration-150
    ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
    ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
  `;

  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const fullNodeObject: CustomNodeType = {
        id, 
        type, 
        position: { x: xPos, y: yPos }, // Use xPos, yPos for position
        data, 
        selected, 
        dragging, 
        zIndex, 
                width: undefined, // Remove reference to non-existent props.width
                height: undefined, // Remove reference to non-existent props.height
        connectable: isConnectable,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={mainDivClasses}
      style={derivedNodeStyles} // Apply derived styles, allowing overrides
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={handleInfoClick}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />

      <p className={`text-[9px] font-semibold text-center truncate w-full ${derivedNodeStyles.color ? '' : textClass}`} title={data.label}>
        {data.label}
      </p>
      
      <motion.svg 
        viewBox="0 0 24 24" 
        width="30" height="30" 
        className={`transition-colors duration-200 ${derivedNodeStyles.color ? '' : textClass}`} 
        style={{ color: derivedNodeStyles.color || ''}}
        initial={false}
      >
        <circle cx="6" cy="8" r="2" fill="currentColor" /> 
        <circle cx="18" cy="8" r="2" fill="currentColor" />
        <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Left contact */}
        <motion.line
          key={`left-contact-${isClosed}`}
          x1="6" y1="10"
          initial={false}
          animate={isClosed ? { x2: 6, y2: 16 } : { x2: 6, y2: 13 }} // Straight for closed, shorter for open start
          transition={{ duration: 0.2, ease: "easeInOut" }}
          stroke="currentColor" strokeWidth="1.5"
        />
        {!isClosed && ( // Angled part for open state
          <motion.line
            key="left-angled-contact"
            x1="6" y1="13" x2="8" y2="15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, delay: 0.15 }} // Delay to appear after main line shortens
            stroke="currentColor" strokeWidth="1.5"
          />
        )}
        
        {/* Right contact (simplified: always straight, changes length) */}
        {/* For a more realistic NO contact, this would also need an angled part */}
        <motion.line
          key={`right-contact-${isClosed}`}
          x1="18" y1="10"
          initial={false}
          animate={isClosed ? { x2: 18, y2: 16 } : { x2: 18, y2: 16 }} // Stays long for NO, but could be y2:13 for visual match
          transition={{ duration: 0.2, ease: "easeInOut" }}
          stroke="currentColor" strokeWidth="1.5"
        />
        
        <rect x="4" y="16" width="16" height="3" rx="1" fill="currentColor" className="opacity-70"/>
      </motion.svg>
      
      <p className={`text-[9px] font-bold ${derivedNodeStyles.color ? '' : textClass}`}>
        {isClosed ? 'CLOSED' : 'OPEN'}
      </p>
    </motion.div>
  );
};

export default memo(ContactorNode);