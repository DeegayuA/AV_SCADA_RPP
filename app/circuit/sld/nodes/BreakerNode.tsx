// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BreakerNodeData, CustomNodeType, SLDElementType } from '@/types/sld'; // Added SLDElementType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
  applyValueMapping,
  getStandardNodeState,
  getNodeAppearanceFromState,
  // NodeAppearance is implied by getNodeAppearanceFromState
} from './nodeUtils';
import { InfoIcon, ShieldAlert, ShieldCheck, ZapOff, Zap } from 'lucide-react'; // Specific icons for states
import { Button } from "@/components/ui/button";

// Define StandardNodeState type locally if not properly imported from nodeUtils
type StandardNodeState = 
    'ENERGIZED_CLOSED' | 'DEENERGIZED_OPEN' | 'DEENERGIZED_CLOSED' | 'ENERGIZED_OPEN' | // Specific breaker/switch states
    'TRIPPED' | 'FAULT' | 'WARNING' | 'OFFLINE' | 'STANDBY' | 'UNKNOWN' | 'NOMINAL' | 'NOMINAL_CLOSED';


// --- Inlined BreakerVisual Component ---
interface BreakerVisualProps {
  isOpen: boolean;
  appearance: {
    iconColorVar: string;      // For the conductive path when closed and energized
    armColorVar?: string;      // Specific color for the arm, defaults to iconColorVar or a neutral
    borderColorVar: string;    // For the chassis/fixed parts
    mainStatusColorVar: string; // General status color, can influence arm when not specifically set
  };
  standardNodeState: StandardNodeState; // To potentially alter visuals for FAULT/TRIPPED further
}

const BreakerVisual: React.FC<BreakerVisualProps> = React.memo(({
  isOpen,
  appearance,
  standardNodeState
}) => {
  const armRotation = isOpen ? -35 : 0; // Degrees for open/closed
  const armColor = appearance.armColorVar || (isOpen || standardNodeState === 'OFFLINE' || standardNodeState === 'DEENERGIZED_OPEN' || standardNodeState === 'TRIPPED' ? 'var(--sld-color-deenergized, #A0AEC0)' : appearance.iconColorVar);
  const chassisFill = 'var(--sld-color-node-bg-subtle, hsl(220, 15%, 96%))';
  const terminalFill = 'var(--sld-color-border-subtle, hsl(220, 15%, 85%))';

  return (
    <svg viewBox="0 0 24 30" width="100%" height="100%" className="drop-shadow-sm">
      {/* Main Body */}
      <rect x="6" y="2" width="12" height="26" rx="1.5" fill={chassisFill} stroke={appearance.borderColorVar} strokeWidth="0.75" />

      {/* Top Fixed Terminal */}
      <circle cx="12" cy="5" r="2.5" fill={terminalFill} />
      <line x1="12" y1="7.5" x2="12" y2="11" stroke={terminalFill} strokeWidth="1.5" />

      {/* Bottom Fixed Terminal */}
      <circle cx="12" cy="25" r="2.5" fill={terminalFill} />
      <line x1="12" y1="19" x2="12" y2="22.5" stroke={terminalFill} strokeWidth="1.5" />
      
      {/* Pivot Point for arm */}
      <circle cx="12" cy="15" r="1" fill={appearance.borderColorVar} />

      {/* Breaker Arm (Lever) */}
      <motion.line
        x1="12" y1="15" // Pivot point
        x2="12" y2="5"  // Extends towards top terminal
        stroke={armColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={false}
        animate={{ rotate: armRotation, stroke: armColor }}
        transform-origin="12 15" // SVG transform origin
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      />
      
      {/* Optional: Handle on the lever */}
      <motion.circle 
        cx="12" 
        cy="5" 
        r="1.5" 
        fill={"color-mix(in srgb, " + armColor + " 70%, black 30%)"} 
        initial={false}
        animate={{ rotate: armRotation, fill: "color-mix(in srgb, " + armColor + " 70%, black 30%)"}}
        transform-origin="12 15"
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      />
    </svg>
  );
});


const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;

  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints,
  }));
  
  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Reactive Data Point Links & Values ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);
  
  const isOpenLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'breaker.isOpen' || link.targetProperty === 'isOpen'), [data.dataPointLinks]);
  const isOpenDataPointConfig = useMemo(() => isOpenLink ? dataPoints[isOpenLink.dataPointId] : undefined, [isOpenLink, dataPoints]);
  const isOpenOpcUaNodeId = useMemo(() => isOpenDataPointConfig?.nodeId, [isOpenDataPointConfig]);
  const reactiveIsOpenValue = useOpcUaNodeValue(isOpenOpcUaNodeId);

  // --- Processed States ---
  const processedStatus = useMemo<string>(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'open').toLowerCase(); // Default to open if no status
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  // Determines if the breaker is considered OPEN (true) or CLOSED (false)
  // Handles various truthy/falsy inputs for state.
  const isBreakerEffectivelyOpen = useMemo<boolean>(() => {
    let valueToCheck: any;
    // Prioritize the specific 'isOpen' or 'breaker.isOpen' link
    if (isOpenLink && isOpenDataPointConfig && reactiveIsOpenValue !== undefined) {
        valueToCheck = applyValueMapping(reactiveIsOpenValue, isOpenLink);
    } else {
        // Fallback to generic 'status' if specific link not present or no value
        valueToCheck = processedStatus; 
    }
    const valStr = String(valueToCheck).toLowerCase();
    // "true", 1, "on", "open", "tripped" are considered OPEN
    if (valStr === 'true' || valStr === '1' || valStr === 'on' || valStr === 'open' || valStr === 'tripped') {
      return true;
    }
    // "false", 0, "off", "closed", "energized", "nominal" are considered CLOSED
    if (valStr === 'false' || valStr === '0' || valStr === 'off' || valStr === 'closed' || valStr === 'energized' || valStr === 'nominal') {
      return false;
    }
    // Fallback to configured normallyOpen state, defaulting to true (open) if undefined
    return data.config?.normallyOpen ?? true; 
  }, [isOpenLink, isOpenDataPointConfig, reactiveIsOpenValue, processedStatus, data.config?.normallyOpen]);

  const standardNodeState = useMemo<StandardNodeState>(() => {
    if (processedStatus === 'fault' || processedStatus === 'tripped_fault') return 'FAULT'; // 'TRIPPED' alone is not necessarily a FAULT state
    if (processedStatus === 'warning') return 'WARNING';
    if (processedStatus === 'offline') return 'OFFLINE';

    if (isBreakerEffectivelyOpen) {
      // If open due to a trip that's not a fault (e.g. manual trip, overload without fault flag)
      if(processedStatus === 'tripped' || processedStatus === 'open_manual') return 'TRIPPED'; // Specific TRIPPED state
      return 'DEENERGIZED_OPEN'; // General open state
    } else { // Breaker is closed
      // If status implies it's energized and passing power
      if (['energized', 'nominal', 'closed_power_flow'].includes(processedStatus)) return 'ENERGIZED_CLOSED';
      // If closed but explicitly standby or no clear indication of power flow
      if (processedStatus === 'standby' || processedStatus === 'closed_standby') return 'STANDBY'; // Or DEENERGIZED_CLOSED if more appropriate
      return 'NOMINAL_CLOSED'; // Default assumption for closed and healthy
    }
  }, [processedStatus, isBreakerEffectivelyOpen]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Breaker), [standardNodeState]);
  const sldAccentVar = 'var(--sld-color-accent)';

  const displayStatusText = useMemo<string>(() => {
    // Show the operational state, e.g. TRIPPED (if fault or manual), OPEN, CLOSED
    if (standardNodeState === 'FAULT') return "FAULT TRIPPED";
    if (standardNodeState === 'TRIPPED') return "TRIPPED";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState === 'OFFLINE') return "OFFLINE";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    return isBreakerEffectivelyOpen ? 'OPEN' : 'CLOSED';
  }, [standardNodeState, isBreakerEffectivelyOpen]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState);
  useEffect(() => {
    if (prevDisplayStatusRef.current !== standardNodeState) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1000);
      prevDisplayStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);
  
  const calculatedMinWidth = 60;
  const calculatedMinHeight = 85;

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    let currentBoxShadow = `0 1px 2px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.02)`;
    if (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') {
        currentBoxShadow = `0 0 0 1.5px ${appearance.borderColorVar}, 0 0 7px 0px ${appearance.borderColorVar}`;
    }
    if (isRecentStatusChange && (appearance.glowColorVar && appearance.glowColorVar !== 'transparent')) {
        currentBoxShadow = `0 0 10px 2px ${appearance.glowColorVar.replace(')', ', 0.45)').replace('var(','rgba(')}`;
    }
    if (selected) {
        currentBoxShadow = `0 0 0 2px ${sldAccentVar.replace(')', ', 0.8)').replace('var(','rgba(')}, 0 0 10px 2px ${sldAccentVar.replace(')', ', 0.5)').replace('var(','rgba(')}`;
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
      borderRadius: '0.375rem', // rounded-md
    };
  }, [appearance, selected, isRecentStatusChange, sldAccentVar, nodeWidthFromData, nodeHeightFromData, standardNodeState]);

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || SLDElementType.Breaker, position: nodePosition, data, selected: selected || false, dragging: dragging || false, 
    zIndex: zIndex || 0, 
    width: nodeWidthFromData || calculatedMinWidth, 
    height: nodeHeightFromData || calculatedMinHeight, 
    connectable: isConnectable || false,
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);
  
  const breakerTypeLabel = data.config?.type || 'Breaker';

  return (
    <motion.div
      className={`breaker-node group sld-node relative flex flex-col items-center 
                  border transition-all duration-150 ease-out overflow-hidden
                  ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
                `}
      style={{ ...nodeMainStyle, background: 'var(--sld-color-node-bg)' }}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, boxShadow: nodeMainStyle.boxShadow }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ 
        scale: isNodeEditable ? 1.025 : 1.01,
        borderColor: selected ? appearance.borderColorVar : sldAccentVar,
        boxShadow: selected 
            ? nodeMainStyle.boxShadow 
            : `${nodeMainStyle.boxShadow || '0 1px 2px rgba(0,0,0,0.04)'}, 0 0 9px 1px ${(appearance.glowColorVar || appearance.mainStatusColorVar).replace(')', ', 0.3)').replace('var(','rgba(')}`
      }}
    >
      {!isEditMode && (
        <Button
          variant="ghost" size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 p-0"
          onClick={(e) => {e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails);}} title="View Details"
        >
          <InfoIcon className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 group-hover/infobtn:text-[var(--sld-color-accent)]" />
        </Button>
      )}

      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: isBreakerEffectivelyOpen ? 'var(--sld-color-handle-bg)' : appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: isBreakerEffectivelyOpen ? 'var(--sld-color-handle-bg)' : appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)' }}/>

      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1 w-full h-full rounded-[calc(0.375rem-1.5px)] ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{ color: appearance.textColorVar }}
      >
        <p className="text-[8px] font-medium text-center truncate w-full pt-0.5" title={`${data.label} (${breakerTypeLabel})`} style={{color: appearance.textColorVar}}>
          {data.label}
        </p>
        
        <div className="w-[28px] h-[34px] my-0.5 flex-shrink-0"> {/* Slightly adjusted size for breaker visual */}
            <BreakerVisual 
                isOpen={isBreakerEffectivelyOpen}
                appearance={appearance}
                standardNodeState={standardNodeState}
            />
        </div>
        
        <p className="text-[9px] font-semibold leading-tight tracking-tight" style={{ color: appearance.statusTextColorVar }}>
          {displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(BreakerNode);