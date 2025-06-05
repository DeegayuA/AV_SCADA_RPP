// components/sld/nodes/FuseNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint, SLDElementType } from '@/types/sld';

interface ExtendedNodeProps<T = any> extends NodeProps<T> {
  position: { x: number, y: number };
  zIndex: number;
  dragging: boolean;
  width?: number | null; // Added from original to ensure full CustomNodeType compatibility
  height?: number | null; // Added from original
}

import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    applyValueMapping,
    getStandardNodeState,
    getNodeAppearanceFromState,
    // NodeAppearance type can be used if needed, but appearance object is directly used
} from './nodeUtils';
import { InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface FuseNodeData extends BaseNodeData {
  type?: 'Cartridge' | 'Blade' | 'HRC';
  elementType: SLDElementType.Fuse; // Ensure this is part of data if not already
}

const FuseNode: React.FC<ExtendedNodeProps<FuseNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props;
  const xPos = position.x;
  const yPos = position.y;
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return String(applyValueMapping(reactiveStatusValue, statusLink));
    }
    return data.status || 'ok'; // Default to ok
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const standardNodeState = useMemo(() => {
    const statusLower = String(processedStatus).toLowerCase();
    let isFuseOpen = false; // A blown fuse is effectively an open circuit
    let isEnergizedForState = true; // Assume energized unless offline

    if (statusLower === 'blown' || statusLower === 'fault' || statusLower === 'alarm') {
      isFuseOpen = true; // Blown fuse means open circuit
      return getStandardNodeState("FAULT", null, isFuseOpen, data.status);
    }
    if (statusLower === 'warning') {
      return getStandardNodeState("WARNING", null, isFuseOpen, data.status);
    }
    if (statusLower === 'offline') {
        isEnergizedForState = false; // Fuse itself is offline
        return getStandardNodeState("OFFLINE", isEnergizedForState, isFuseOpen, data.status);
    }
    // For 'ok', 'nominal'
    // If we don't have explicit energized status for a fuse, we can assume it's DEENERGIZED
    // if we want a less prominent color for "OK" by default, or NOMINAL/ENERGIZED for prominent.
    // Let's default to NOMINAL for "OK" fuses.
    return getStandardNodeState("NOMINAL", null, isFuseOpen, data.status);
  }, [processedStatus, data.status]);

  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState, SLDElementType.Fuse), [standardNodeState]);
  const OverlayIconComponent = useMemo(() =>
    (standardNodeState === 'FAULT' || standardNodeState === 'WARNING') ? appearance.icon : null,
  [standardNodeState, appearance.icon]);
  const isBlownForSVG = useMemo(() => standardNodeState === 'FAULT', [standardNodeState]);

  const displayStatusText = useMemo(() => {
    if (standardNodeState === 'FAULT') return 'BLOWN';
    if (standardNodeState === 'WARNING') return 'WARNING';
    if (standardNodeState === 'NOMINAL' || standardNodeState === 'ENERGIZED' || standardNodeState === 'DEENERGIZED') return 'OK';
    if (standardNodeState === 'OFFLINE') return 'OFFLINE';
    return standardNodeState.replace(/_/g, ' ');
  }, [standardNodeState]);

  const sldAccentVar = 'var(--sld-color-accent)';

  const FuseSymbolSVG = ({ className, isBlownVisual, color }: { className?: string, isBlownVisual?: boolean, color: string }) => {
    const lineVariants = {
      intact: { pathLength: 1, opacity: 1 },
      brokenVisible: { pathLength: 0.4, opacity: 1 },
      brokenHidden: { pathLength: 0, opacity: 0 },
    };
    const crossVariants = {
        hidden: { opacity: 0, scale: 0.5 },
        visible: { opacity: 1, scale: 1, transition: { delay: 0.1, duration: 0.2 } },
    };

    return (
      <motion.svg viewBox="0 0 24 12" width="36" height="18" className={className} initial={false} style={{ color }}>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {!isBlownVisual && <motion.line key="intact-line" x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="intact" />}
        {isBlownVisual && (
          <>
            <motion.line key="blown-seg1" x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            <motion.line key="blown-seg2" x1="14" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="1.5" variants={lineVariants} animate="brokenVisible" />
            <motion.line key="cross1" x1="10" y1="4" x2="14" y2="8" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
            <motion.line key="cross2" x1="10" y1="8" x2="14" y2="4" stroke="currentColor" strokeWidth="1" variants={crossVariants} animate="visible" />
          </>
        )}
      </motion.svg>
    );
  };
  
  const mainDivClasses = `
    sld-node fuse-node group custom-node-hover w-[60px] h-[75px] rounded-md shadow-md
    flex flex-col items-center justify-between
    border-2
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
  `;
  
  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(standardNodeState);

  useEffect(() => {
    if (prevStatusRef.current !== standardNodeState) {
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
        borderColor: appearance.borderColorVar,
        opacity: data.opacity,
        ringColor: selected ? sldAccentVar : 'transparent',
      }}
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1.01 }}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          onClick={(e) => {
            e.stopPropagation();
            const fullNodeObject: CustomNodeType = {
                id, type: type as SLDElementType,
                position: { x: xPos, y: yPos }, 
                data, selected, 
                width: width || undefined,
                height: height || undefined,
                connectable: isConnectable,
                dragging: dragging,
                zIndex: zIndex,
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

      <div 
        className={`node-content-wrapper flex flex-col items-center justify-between p-1.5 w-full h-full rounded-sm
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`} 
        style={{
          background: 'var(--sld-color-node-bg)',
          color: appearance.textColorVar,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label} style={{color: appearance.textColorVar}}>
          {data.label}
        </p>
        
        <div className="my-0.5 pointer-events-none relative">
          <FuseSymbolSVG
            className="transition-colors"
            isBlownVisual={isBlownForSVG}
            color={isBlownForSVG ? appearance.iconColorVar : appearance.mainStatusColorVar } // Fault color for blown, nominal/main for intact
          />
          {OverlayIconComponent && ( // This will be XCircle or AlertTriangle for FAULT/WARNING
              <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{duration: 0.2}}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                  <OverlayIconComponent size={12} style={{color: appearance.iconColorVar}}/>
              </motion.div>
          )}
        </div>
        
        <p className="text-[9px] text-center truncate w-full leading-tight" title={data.config?.ratingAmps ? `${data.config.ratingAmps}A` : displayStatusText} style={{color: appearance.statusTextColorVar}}>
          {data.config?.ratingAmps ? `${data.config.ratingAmps}A` : displayStatusText}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(FuseNode);