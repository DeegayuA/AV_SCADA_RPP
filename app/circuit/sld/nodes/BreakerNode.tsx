// components/sld/nodes/BreakerNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BreakerNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
  applyValueMapping,
  // formatDisplayValue, // May not be needed directly if status text comes from standard state
  // getDerivedStyle, // Will be replaced by new system
  getStandardNodeState,
  getNodeAppearanceFromState,
  NodeAppearance
} from './nodeUtils';
// Removed direct icon imports if NodeAppearance provides them, or keep if used elsewhere.
// For now, assume specific icons like InfoIcon for button are still needed.
import { InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// const useIsDarkMode = () => { // CSS variables will handle dark mode
//   const [isDark, setIsDark] = useState(() => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
//   useEffect(() => {
//     if (typeof window === 'undefined') return;
//     const cb = () => setIsDark(document.documentElement.classList.contains('dark'));
//     const observer = new MutationObserver(cb);
//     observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
//     cb();
//     return () => observer.disconnect();
//   }, []);
//   return isDark;
// };

const BreakerNode: React.FC<NodeProps<BreakerNodeData>> = (props) => {
  const { 
    data, selected, isConnectable, id, type, 
    xPos, yPos, dragging, zIndex 
  } = props;

  const nodePosition = useMemo((): XYPosition => ({ x: xPos || 0, y: yPos || 0 }), [xPos, yPos]);
  const nodeWidthFromData = data.width; 
  const nodeHeightFromData = data.height;

  // const isDarkMode = useIsDarkMode(); // Replaced by CSS variables

  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));
  
  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Reactive Data Point Links & Values ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);
  
  // Handles breaker.isOpen or the more generic isOpen
  const isOpenLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'isOpen' || link.targetProperty === 'breaker.isOpen'), [data.dataPointLinks]);
  const isOpenDataPointConfig = useMemo(() => isOpenLink ? dataPoints[isOpenLink.dataPointId] : undefined, [isOpenLink, dataPoints]);
  const isOpenOpcUaNodeId = useMemo(() => isOpenDataPointConfig?.nodeId, [isOpenDataPointConfig]);
  const reactiveIsOpenValue = useOpcUaNodeValue(isOpenOpcUaNodeId);

  // --- Processed States ---
  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink)).toLowerCase();
    }
    return String(data.status || 'offline').toLowerCase(); // Keep this for now, might be used by getStandardNodeState
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const isBreakerOpenRaw = useMemo(() => { // Renamed to avoid immediate conflict
    if (isOpenLink && isOpenDataPointConfig && reactiveIsOpenValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveIsOpenValue, isOpenLink);
      return mappedValue === true || String(mappedValue).toLowerCase() === 'true' || String(mappedValue).toLowerCase() === 'open' || Number(mappedValue) === 1;
    }
    const status = processedStatus; // Use the memoized processedStatus
    if (status === 'open' || status === 'tripped') return true;
    if (status === 'closed' || status === 'nominal' || status === 'energized') return false;
    return data.config?.normallyOpen ?? false; 
  }, [isOpenLink, isOpenDataPointConfig, reactiveIsOpenValue, processedStatus, data.config?.normallyOpen]);

  // --- Standardized State and Appearance ---
  const standardNodeState = useMemo(() => {
    // For Breaker, isEnergized might be inferred or explicitly linked.
    // Assuming 'processedStatus' can indicate energized states like 'ENERGIZED', 'NOMINAL'.
    // Or, a separate 'isEnergized' link could be added if available.
    // For now, let's infer: if status is 'nominal', 'closed', 'energized' and not open, it's energized.
    // This logic might need refinement based on actual data point availability for 'isEnergized'.
    let isEnergizedInferred: boolean | undefined = undefined;
    if (processedStatus === 'energized' || processedStatus === 'nominal' || processedStatus === 'closed') {
      isEnergizedInferred = true;
    } else if (processedStatus === 'offline' || processedStatus === 'deenergized' || processedStatus === 'open') {
      isEnergizedInferred = false;
    }
    // If an explicit 'isEnergized' link exists, it should take precedence.
    // This part is left for future enhancement if a dedicated isEnergized DP is common for breakers.

    return getStandardNodeState(processedStatus, isEnergizedInferred, isBreakerOpenRaw, data.status);
  }, [processedStatus, isBreakerOpenRaw, data.status]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);

  // Descriptive status text for UI - can be simplified if standardState is rich enough
  const displayStatusText = useMemo(() => {
    // You can customize this further based on standardNodeState if needed
    if (standardNodeState === 'FAULT') return "TRIPPED / FAULT";
    if (standardNodeState === 'WARNING') return "WARNING";
    if (standardNodeState.includes('OFFLINE') || standardNodeState.includes('DEENERGIZED')) return "OFFLINE / OPEN";
    if (standardNodeState.includes('ENERGIZED_CLOSED') || standardNodeState.includes('NOMINAL_CLOSED') || standardNodeState === 'NOMINAL' || standardNodeState === 'ENERGIZED') return "NOMINAL";
    if (standardNodeState === 'STANDBY') return "STANDBY";
    return standardNodeState.replace(/_/g, ' '); // Default, make it readable
  }, [standardNodeState]);

  // const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]); // Replaced by `appearance`
  const sldAccentVar = 'var(--sld-color-accent)'; // For selection, from globals.css

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevDisplayStatusRef = useRef(standardNodeState); // Track standard state for changes
  useEffect(() => {
    if (prevDisplayStatusRef.current !== standardNodeState) { // Check standardNodeState
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200); // Animation duration for highlight
      prevDisplayStatusRef.current = standardNodeState;
      return () => clearTimeout(timer);
    }
  }, [standardNodeState]);

  const nodeMainStyle = useMemo((): React.CSSProperties => {
    // CSS variables for background are not directly settable like this in inline styles for gradients.
    // We'll rely on global CSS or Tailwind utility for background.
    // Forcing a re-render via a key or other state might be needed if bg vars change dynamically.
    // However, the theme switch (.dark) should handle this at a higher level.

    let currentBoxShadow = `0 0 7px 1.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.45)').replace('var(','rgba(')}`;

    const isNominalClosed = standardNodeState === 'ENERGIZED_CLOSED' || standardNodeState === 'NOMINAL_CLOSED';
    
    if (isNominalClosed && !selected && !isRecentStatusChange) {
      // Breathing glow handled by framer-motion animate prop using CSS variable from appearance
    }
    if (isRecentStatusChange) { // Stronger glow for status change
        currentBoxShadow = `0 0 13px 3px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.65)').replace('var(','rgba(')}`;
    }
    if (selected) { // Selection glow using accent color
        currentBoxShadow = `0 0 14px 2.5px ${sldAccentVar.replace(')', ', 0.7)').replace('var(','rgba(')}, 0 0 4px 1px ${sldAccentVar.replace(')', ', 0.5)').replace('var(','rgba(')} inset`;
    }
    
    return {
      borderColor: appearance.borderColorVar, // Use CSS variable string directly
      boxShadow: currentBoxShadow,
      width: typeof nodeWidthFromData === 'number' ? `${nodeWidthFromData}px` : '70px',
      height: typeof nodeHeightFromData === 'number' ? `${nodeHeightFromData}px` : '95px',
      color: appearance.textColorVar, // Default text color for the node
    };
  }, [appearance, selected, isRecentStatusChange, standardNodeState, sldAccentVar, nodeWidthFromData, nodeHeightFromData]);

  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id, type: type || '', position: nodePosition, data,
    selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0, 
    width: nodeWidthFromData, height: nodeHeightFromData,
    connectable: isConnectable || false
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidthFromData, nodeHeightFromData, isConnectable]);
  
  const breakerTypeLabel = data.config?.type || 'Breaker';
  const tripRatingText = data.config?.tripRatingAmps ? `${data.config.tripRatingAmps}A` : breakerTypeLabel.toUpperCase();

  return (
    <motion.div
      className={`
        breaker-node group sld-node relative flex flex-col items-center justify-between 
        rounded-lg border backdrop-blur-sm
        transition-colors duration-300 ease-in-out
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10 shadow-lg` : 'shadow-md'}
        overflow-hidden 
      `}
      style={{ // Apply border color from JS, ring color from CSS var for selection
        ...nodeMainStyle,
        background: `linear-gradient(to bottom, var(--sld-color-node-bg), color-mix(in srgb, var(--sld-color-node-bg) 90%, black))`, // Example gradient
        ringColor: selected ? sldAccentVar : 'transparent', // Selection ring
      }}
      initial={{ opacity: 0, scale: 0.88, y: 15 }}
      animate={{ 
        opacity: 1, scale: 1, y: 0,
        boxShadow: (standardNodeState === 'ENERGIZED_CLOSED' || standardNodeState === 'NOMINAL_CLOSED') && !selected && !isRecentStatusChange
          ? [ // Breathing glow for nominal closed state
              `0 0 8px 1.5px ${appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`,
              `0 0 12px 2.5px ${appearance.mainStatusColorVar.replace(')', ', 0.5)').replace('var(','rgba(')}`,
              `0 0 8px 1.5px ${appearance.mainStatusColorVar.replace(')', ', 0.3)').replace('var(','rgba(')}`
            ]
          : nodeMainStyle.boxShadow // Use calculated shadow for other states
      }} 
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15, ease: "easeOut"} }}
      transition={ // Animation for breathing glow
        (standardNodeState === 'ENERGIZED_CLOSED' || standardNodeState === 'NOMINAL_CLOSED') && !selected && !isRecentStatusChange
          ? { type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }
          : { type: 'spring', stiffness: 280, damping: 25 } // Default transition
      }
      whileHover={{ 
        scale: isNodeEditable ? 1.035 : 1.02,
        boxShadow: selected 
            ? `0 0 18px 3.5px ${sldAccentVar.replace(')', ', 0.8)').replace('var(','rgba(')}, 0 0 6px 1.5px ${sldAccentVar.replace(')', ', 0.6)').replace('var(','rgba(')} inset`
            : `0 0 15px 3.5px ${appearance.glowColorVar || appearance.mainStatusColorVar.replace(')', ', 0.6)').replace('var(','rgba(')}`
      }}
      onClick={(e) => { 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle 
        type="target" position={Position.Top} id="top_in" isConnectable={isConnectable}
        className="sld-handle-style" // Apply shared handle style from globals.css
        style={{ background: appearance.mainStatusColorVar === 'var(--sld-color-deenergized)' ? 'var(--sld-color-handle-bg)' : appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)'}}
        title="Input"
      />
      <Handle 
        type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable}
        className="sld-handle-style"
        style={{ background: appearance.mainStatusColorVar === 'var(--sld-color-deenergized)' ? 'var(--sld-color-handle-bg)' : appearance.mainStatusColorVar, borderColor: 'var(--sld-color-handle-border)'}}
        title="Output"
      />

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-1 right-1 h-6 w-6 rounded-full z-20 group/infobtn
                     bg-slate-300/20 dark:bg-slate-700/20 hover:bg-slate-300/40 dark:hover:bg-slate-700/40
                     p-0 backdrop-blur-sm transition-all duration-200" 
          onClick={(e) => { e.stopPropagation(); setSelectedElementForDetails(fullNodeObjectForDetails); }}
        >
          <InfoIcon className={`h-3.5 w-3.5 text-slate-500 dark:text-slate-400 
                                group-hover/infobtn:text-[var(--sld-color-accent)]
                                transition-colors duration-150`} /> 
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-between w-full h-full px-1.5 py-1 pointer-events-none space-y-0.5">
        {/* Top status text (optional, small) */}
        <div className="h-3 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={`desc-status-${displayStatusText}`}
                    className={`text-[8px] font-medium tracking-tight leading-tight text-center w-full transition-colors duration-200`}
                    style={{ color: appearance.statusTextColorVar }}
                    title={`Status: ${displayStatusText}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                    {displayStatusText}
                </motion.p>
            </AnimatePresence>
        </div>
        
        {/* Breaker Label */}
        <motion.p
          className="text-xs font-bold leading-tight text-center w-full transition-colors duration-200"
          style={{ color: appearance.textColorVar }}
          title={`${data.label} (${breakerTypeLabel})`}
        >
          {data.label}
        </motion.p>

        {/* SVG Breaker Visual */}
        <motion.svg 
          viewBox="0 0 24 24" 
          width="30" height="30" 
          className="flex-shrink-0 my-0.5" 
          style={{ color: appearance.iconColorVar }} // Main color for terminals and body
          initial={false}
          animate={{ color: appearance.iconColorVar }}
          transition={{duration: 0.3}}
        >
          {/* Terminals */}
          <circle cx="12" cy="6" r="2.2" fill="currentColor" />
          <circle cx="12" cy="18" r="2.2" fill="currentColor" />
          {/* Static connection from top terminal to center body */}
          <line x1="12" y1="8.2" x2="12" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          {/* Animated Breaker Arm */}
          <motion.line
            key={isBreakerOpenRaw ? "breaker-open-arm" : "breaker-closed-arm"}
            x1="12" y1="12.5"
            initial={false}
            animate={isBreakerOpenRaw
                ? { x2: 18, y2: 9, strokeWidth: 2, stroke: appearance.armColorVar || appearance.iconColorVar }
                : { x2: 12, y2: 15.8, strokeWidth: 2.2, stroke: appearance.armColorVar || appearance.iconColorVar }
            }
            transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.25 }}
            strokeLinecap="round"
          />
          {/* Center Body/Housing */}
          <rect x="9" y="10.5" width="6" height="3" rx="1" fill="currentColor" className="opacity-70" />
           <motion.circle 
            cx="12" cy="12.5" r="1.2" 
            fill={"color-mix(in srgb, currentColor 30%, var(--sld-color-node-bg))"} // Mix with node background
            initial={{ opacity: isBreakerOpenRaw ? 0 : 1 }}
            animate={{ opacity: isBreakerOpenRaw ? 0 : 1 }}
            transition={{ duration: 0.1 }}
          />
        </motion.svg>

        {/* Main Open/Closed Status */}
        <div className="h-4 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={`main-status-${isBreakerOpenRaw}`}
                    className={`text-sm font-semibold leading-tight text-center w-full transition-colors duration-200`}
                    style={{ color: appearance.mainStatusColorVar }}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    {isBreakerOpenRaw ? 'OPEN' : 'CLOSED'}
                </motion.p>
            </AnimatePresence>
        </div>

        {/* Trip Rating / Type */}
        <p className="text-[9px] text-muted-foreground dark:text-slate-400/80 text-center truncate w-full leading-tight font-medium" title={tripRatingText}
           style={{ color: appearance.textColorVar === 'var(--sld-color-text)' ? 'var(--color-muted-foreground)' : appearance.textColorVar }} // Use muted if main text is default
        >
          {tripRatingText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(BreakerNode);