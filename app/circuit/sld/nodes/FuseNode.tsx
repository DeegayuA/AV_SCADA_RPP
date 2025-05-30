// components/sld/nodes/FuseNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow'; // Added Node type
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld'; // Added SLDElementType

interface ExtendedNodeProps<T = any> extends NodeProps<T> {
  position: { x: number, y: number };
  zIndex: number;
  dragging: boolean; // Removed optional modifier (?) since NodeProps requires this to be boolean
}

import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, getDerivedStyle } from './nodeUtils';
import { ZapIcon, ShieldOffIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface FuseNodeData extends BaseNodeData {
  type?: 'Cartridge' | 'Blade' | 'HRC';
  elementType: SLDElementType.Fuse;
}

const FuseNode: React.FC<ExtendedNodeProps<FuseNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging } = props;
  const xPos = position.x;
  const yPos = position.y;
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
      const rawValue = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues); // Correct parameter order
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'ok'; // Default to ok
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const { statusText, baseClasses, BlownOverlayIcon, isBlown, isWarning } = useMemo(() => {
    let icon: React.ElementType | null = null;
    let text = String(processedStatus).toUpperCase();
    let classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; // Nominal 'ok'
    let blown = false;
    let warning = false;

    switch (String(processedStatus).toLowerCase()) {
      case 'blown': case 'fault': case 'alarm':
        icon = ShieldOffIcon; text = 'BLOWN';
        classes = 'border-destructive bg-destructive/10 text-destructive';
        blown = true;
        break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'WARNING';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
        warning = true;
        break;
      case 'ok': case 'nominal': default:
        icon = null; text = 'OK';
        // classes remain as initialized (green)
        break;
    }
    return { BlownOverlayIcon: icon, statusText: text, baseClasses: classes, isBlown: blown, isWarning: warning };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaNodeValues), // Fixed parameter order to match function definition
    [data, dataPoints, opcUaNodeValues]
  );

  const FuseSymbolSVG = ({ className, isBlown }: { className?: string, isBlown?: boolean }) => {
    const lineVariants = {
      intact: { pathLength: 1, opacity: 1 },
      brokenVisible: { pathLength: 0.4, opacity: 1 }, // For the first segment
      brokenHidden: { pathLength: 0, opacity: 0 },   // For the middle segment that disappears
    };
    const crossVariants = {
        hidden: { opacity: 0, scale: 0.5 },
        visible: { opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.2 } },
    };

    return (
      <motion.svg viewBox="0 0 24 12" width="36" height="18" className={className} initial={false}>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {!isBlown && <motion.line key="intact-line" x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="intact" />}
        {isBlown && (
          <>
            {/* Two segments of the broken line */}
            <motion.line key="blown-seg1" x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            <motion.line key="blown-seg2" x1="14" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            {/* Crossed lines in the middle */}
            <motion.line key="cross1" x1="10" y1="4" x2="14" y2="8" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
            <motion.line key="cross2" x1="10" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
          </>
        )}
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node fuse-node group custom-node-hover w-[60px] h-[75px] rounded-md shadow-md
    flex flex-col items-center justify-between /* p-1.5 removed, moved to content wrapper */
    border-2 ${derivedNodeStyles.borderColor ? '' : baseClasses.split(' ')[0]} 
    /* specific bgClass from baseClasses, bg-card removed, moved to content wrapper */
    /* transition-all duration-150 is part of custom-node-hover */
    /* selected ring styles removed */
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
    /* hover:shadow-lg removed */
  `;
  // effectiveSymbolColor and effectiveTextColor will be applied to the node-content-wrapper or inherited
  
  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);

  useEffect(() => {
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700); // Match animation duration
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
  }, [processedStatus]);

  return (
    <motion.div
      className={mainDivClasses}
      style={{
        borderColor: derivedNodeStyles.borderColor || undefined, // Apply border from derived or let class handle
        opacity: derivedNodeStyles.opacity || undefined,
        // backgroundColor and color are now primarily for the node-content-wrapper
      }}
      // variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      {/* Info Button: position absolute, kept outside node-content-wrapper */}
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation(); // Prevent node selection
            const fullNodeObject: CustomNodeType = {
                id, type, 
                position: { x: xPos, y: yPos }, 
                data, selected, 
                width: undefined, height: undefined, 
                connectable: isConnectable,
                // dragging and zIndex are not part of CustomNodeType but are in props
                dragging: props.dragging, 
                zIndex: props.zIndex,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Handles are outside node-content-wrapper */}
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" />

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1.5 w-full h-full rounded-sm
                    ${derivedNodeStyles.backgroundColor ? '' : baseClasses.split(' ')[1]} /* bg from baseClasses */
                    ${derivedNodeStyles.color ? '' : baseClasses.split(' ')[2]} /* text color from baseClasses */
                    bg-card dark:bg-neutral-800
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          backgroundColor: derivedNodeStyles.backgroundColor || undefined,
          color: derivedNodeStyles.color || undefined, 
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label} {/* Text color will be inherited from parent */}
        </p>
        
        <div className="my-0.5 pointer-events-none relative">
          {/* SVG color will be inherited from parent's text color */}
          <FuseSymbolSVG className="transition-colors" isBlown={isBlown} /> 
          {BlownOverlayIcon && (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: (isBlown || isWarning) ? 0.8 : 0, scale: (isBlown || isWarning) ? 1 : 0.5 }}
                  transition={{duration: 0.2}}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                  {/* Icon color will be inherited */}
                  <BlownOverlayIcon size={12} /> 
              </motion.div>
          )}
        </div>
        
        <p className="text-[9px] text-center truncate w-full leading-tight" title={data.config?.ratingAmps ? `${data.config.ratingAmps}A` : statusText}>
          {data.config?.ratingAmps ? `${data.config.ratingAmps}A` : statusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(FuseNode);