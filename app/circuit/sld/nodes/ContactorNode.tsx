// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow'; // Added XYPosition
import { motion } from 'framer-motion'; // Removed AnimatePresence (not used actively)
import { ContactorNodeData, CustomNodeType, DataPointLink, SLDElementType } from '@/types/sld'; // Removed DataPoint
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    getStandardNodeState,
    getNodeAppearanceFromState,
    // NodeAppearance, // Not directly used, type comes from getNodeAppearanceFromState
} from './nodeUtils';
import { InfoIcon, MinusIcon, PowerIcon, CircleIcon } from 'lucide-react'; // Example icons
import { Button } from "@/components/ui/button";

// Define StandardNodeState type locally if not properly imported from nodeUtils
type StandardNodeState = 'ENERGIZED' | 'STANDBY' | 'OFFLINE' | 'FAULT' | 'WARNING' | 'UNKNOWN' | 'NOMINAL' | 'DEENERGIZED'; // Added DEENERGIZED


// --- Inlined ContactorVisual Component ---
interface ContactorVisualProps {
  isClosed: boolean;
  appearance: {
    iconColorVar: string; // Used for energized parts
    borderColorVar: string; // For outline
    mainStatusColorVar: string; // Can be used for the moving bar when energized
    statusTextColorVar: string; // Color for text status (Open/Closed)
    textColorVar: string; // General text color
  };
  standardNodeState: StandardNodeState; // For fault/warning overlays
}

const ContactorVisual: React.FC<ContactorVisualProps> = React.memo(({
  isClosed,
  appearance,
  standardNodeState,
}) => {
  const contactBarY = isClosed ? 20 : 12; // Y position of the movable contact bar
  const contactColor = isClosed ? appearance.iconColorVar : 'var(--sld-color-deenergized, #A0AEC0)'; // Use iconColorVar when closed
  const chassisFillColor = 'var(--sld-color-node-bg-subtle, #e0e0e0)';
  const contactTerminalFill = 'var(--sld-color-border-subtle, #cbd5e0)';

  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" className="drop-shadow-sm">
      {/* Main Body */}
      <rect x="5" y="5" width="30" height="30" rx="2" fill={chassisFillColor} stroke={appearance.borderColorVar} strokeWidth="1" />

      {/* Fixed Terminals/Contacts */}
      <circle cx="12" cy="8" r="3" fill={contactTerminalFill} stroke={appearance.borderColorVar} strokeWidth="0.5" />
      <circle cx="28" cy="8" r="3" fill={contactTerminalFill} stroke={appearance.borderColorVar} strokeWidth="0.5" />
      
      <circle cx="12" cy="32" r="3" fill={contactTerminalFill} stroke={appearance.borderColorVar} strokeWidth="0.5" />
      <circle cx="28" cy="32" r="3" fill={contactTerminalFill} stroke={appearance.borderColorVar} strokeWidth="0.5" />

      {/* Internal lines to suggest connections to fixed terminals (optional) */}
      <line x1="12" y1="8" x2="12" y2="15" stroke={contactTerminalFill} strokeWidth="1.5" />
      <line x1="28" y1="8" x2="28" y2="15" stroke={contactTerminalFill} strokeWidth="1.5" />
      <line x1="12" y1="32" x2="12" y2="25" stroke={contactTerminalFill} strokeWidth="1.5" />
      <line x1="28" y1="32" x2="28" y2="25" stroke={contactTerminalFill} strokeWidth="1.5" />


      {/* Movable Contact Bar - Animates up/down */}
      <motion.g
        initial={false}
        animate={{ y: isClosed ? 5 : -3 }} // Adjust these values for desired movement
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Plunger/Actuator part */}
        <rect x="16" y="15" width="8" height="5" rx="1" fill="var(--sld-color-border, #a0aec0)" />
        {/* Contact bridge */}
        <rect x="8" y="18" width="24" height="4" rx="1" fill={contactColor} stroke={appearance.borderColorVar} strokeWidth="0.5" />
      </motion.g>

       {/* Coil symbol (simplified) */}
      <rect x="17" y="30" width="6" height="3" rx="1" fill="none" stroke="var(--sld-color-text-muted)" strokeWidth="0.7" />
      <text x="20" y="2.5" dominantBaseline="middle" textAnchor="middle" fontSize="3" fill="var(--sld-color-text-muted)">A1</text>
      <text x="20" y="37.5" dominantBaseline="middle" textAnchor="middle" fontSize="3" fill="var(--sld-color-text-muted)">A2</text>


      {/* Fault/Warning Indicator overlay if applicable */}
      {(standardNodeState === 'FAULT' || standardNodeState === 'WARNING') && (
         <motion.rect
          x="0" y="0" width="40" height="40" rx="2" ry="2" 
          fill="none" // Only stroke for emphasis
          stroke={standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}
          strokeWidth="2.5"
          initial={{ opacity: 0.7, strokeDasharray: "10 5", strokeDashoffset:0 }} 
          animate={{ opacity: [0.7,1,0.7], strokeDashoffset: [0, 15, 30] }} 
          transition={{ duration: 1.2, repeat: Infinity, ease:"linear" }}
        />
      )}
    </svg>
  );
});
// --- End of Inlined ContactorVisual Component ---

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Removed globalOpcUaNodeValues
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));

  const nodeWidthFromData = data.width; // Get width from data if provided
  const nodeHeightFromData = data.height; // Get height from data if provided

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);


  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Reactive Data Point Handling ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const isClosedLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'contactor.isClosed' || link.targetProperty === 'isClosed'), [data.dataPointLinks]); // Added common 'isClosed'
  const isClosedDataPointConfig = useMemo(() => isClosedLink ? dataPoints[isClosedLink.dataPointId] : undefined, [isClosedLink, dataPoints]);
  const isClosedOpcUaNodeId = useMemo(() => isClosedDataPointConfig?.nodeId, [isClosedDataPointConfig]);
  const reactiveIsClosedValue = useOpcUaNodeValue(isClosedOpcUaNodeId);
  
  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'open').toLowerCase(); // Default to 'open' if no status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);
  
  const isContactorClosed = useMemo<boolean>(() => {
    let valueToCheck: any;
    if (isClosedLink && isClosedDataPointConfig && reactiveIsClosedValue !== undefined) {
        valueToCheck = applyValueMapping(reactiveIsClosedValue, isClosedLink);
    } else {
        valueToCheck = processedStatus; // Fallback to generic status if specific link not present
    }

    const valStr = String(valueToCheck).toLowerCase();
    return valStr === 'true' || valStr === '1' || valStr === 'on' || valStr === 'closed' || valStr === 'energized';
  }, [isClosedLink, isClosedDataPointConfig, reactiveIsClosedValue, processedStatus]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
    const statusLower = processedStatus;
    if (statusLower === 'fault' || statusLower === 'alarm') return 'FAULT';
    if (statusLower === 'warning') return 'WARNING';
    if (statusLower === 'offline') return 'OFFLINE';
    // If 'status' indicates open/closed, it might override the 'isClosed' specific link, or work in tandem.
    // This assumes that if `isContactorClosed` is true, the path should be styled as energized (unless overridden by fault/etc.)
    return isContactorClosed ? 'ENERGIZED' : 'DEENERGIZED';
  }, [processedStatus, isContactorClosed]);
  
  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Contactor), [standardNodeState]);
  const sldAccentVar = 'var(--sld-color-accent)';

  const displayStatusText = useMemo(() => isContactorClosed ? 'CLOSED' : 'OPEN', [isContactorClosed]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStandardNodeState = useRef(standardNodeState);
  useEffect(() => {
    if (prevStandardNodeState.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1000); // Slightly longer highlight
      prevStandardNodeState.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const calculatedMinWidth = 60;
  const calculatedMinHeight = 75;

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 1px 2px rgba(0,0,0,0.06)`; 
    if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
        currentBoxShadow = `0 0 8px 1px ${standardNodeState === 'FAULT' ? 'var(--sld-color-fault)' : 'var(--sld-color-warning)'}`;
    }
     if (isRecentStatusChange) { // Emphasize recent change
        currentBoxShadow = `0 0 12px 3px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.5)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 0 2px ${sldAccentVar.replace(')', ', 0.75)').replace('var(','rgba(')}, 0 0 10px 1.5px ${sldAccentVar.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    }
    
    return {
      borderColor: appearance.borderColorVar,
      borderWidth: '1.5px',
      boxShadow: currentBoxShadow,
      color: appearance.textColorVar,
      minWidth: `${calculatedMinWidth}px`,
      minHeight: `${calculatedMinHeight}px`,
      width: nodeWidthFromData ? `${nodeWidthFromData}px` : `${calculatedMinWidth}px`,
      height: nodeHeightFromData ? `${nodeHeightFromData}px` : `${calculatedMinHeight}px`,
      borderRadius: '0.375rem', // md
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);
  

  const handleInfoClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const fullNodeObject: CustomNodeType = {
        id, type: type || SLDElementType.Contactor, position: nodePosition, data, selected: selected || false, dragging: dragging || false, 
        zIndex: zIndex || 0, 
        width: nodeWidthFromData || calculatedMinWidth, 
        height: nodeHeightFromData || calculatedMinHeight, 
        connectable: isConnectable || false,
    };
    setSelectedElementForDetails(fullNodeObject);
  };

  return (
    <motion.div
      className={`sld-node contactor-node group custom-node-hover flex flex-col items-center border overflow-hidden
                 transition-all duration-150 ease-out
                 ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
                `}
      style={{ ...nodeMainStyle, background: 'var(--sld-color-node-bg)' }}
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, boxShadow: nodeMainStyle.boxShadow }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1.01, 
        boxShadow: selected 
            ? nodeMainStyle.boxShadow 
            : `${nodeMainStyle.boxShadow || '0 1px 2px rgba(0,0,0,0.06)'}, 0 0 10px 1.5px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.3)').replace('var(','rgba(')}`
      }}
    >
      {!isEditMode && (
        <Button
          variant="ghost" size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0"
          onClick={handleInfoClick} title="View Details"
        >
          <InfoIcon className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 group-hover:text-[var(--sld-color-accent)]" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      {/* Optional: Side handles for control signal if needed for coil */}
      {/* <Handle type="target" position={Position.Left} id="coil_a1" title="Coil A1" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !-ml-0.5" style={{top: '85%'}} /> */}
      {/* <Handle type="target" position={Position.Right} id="coil_a2" title="Coil A2" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !-mr-0.5" style={{top: '85%'}}/> */}


      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1 w-full h-full rounded-[calc(0.375rem-1.5px)]  ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{ color: appearance.textColorVar }} // General text color from appearance
      >
        <p className="text-[8px] font-medium text-center truncate w-full pt-0.5" title={data.label} style={{color: appearance.textColorVar}}>
          {data.label}
        </p>
        
        <div className="w-[32px] h-[32px] my-0.5 flex-shrink-0"> {/* Fixed size for SVG container */}
            <ContactorVisual 
                isClosed={isContactorClosed}
                appearance={appearance}
                standardNodeState={standardNodeState}
            />
        </div>
        
        <p className="text-[9px] font-semibold leading-tight" style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(ContactorNode);