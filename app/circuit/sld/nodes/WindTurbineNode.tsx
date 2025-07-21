// components/sld/nodes/WindTurbineNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, Node } from 'reactflow';
import { motion } from 'framer-motion';
import { GeneratorNodeData, CustomNodeType, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { WindIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon, CogIcon, PowerIcon, InfoIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

const WindTurbineNode: React.FC<NodeProps<GeneratorNodeData> & Pick<Node<GeneratorNodeData>, 'position' | 'width' | 'height' | 'dragging' | 'zIndex'>> = (props) => {
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

  const processedStatus = useMemo(() => {
    const statusLink = data.dataPointLinks?.find(link => link.targetProperty === 'status');
    if (statusLink && dataPoints && dataPoints[statusLink.dataPointId] && opcUaNodeValues) {
      const rawValue = getDataPointValue(statusLink.dataPointId, dataPoints, opcUaNodeValues);
      return applyValueMapping(rawValue, statusLink);
    }
    return data.status || 'offline';
  }, [data.dataPointLinks, data.status, opcUaNodeValues, dataPoints]);

  const powerOutput = useMemo(() => {
    const powerLink = data.dataPointLinks?.find(
      link => link.targetProperty === 'powerOutput' || link.targetProperty === 'activePower'
    );
    if (powerLink && dataPoints && dataPoints[powerLink.dataPointId] && opcUaNodeValues) {
      const dpMeta = dataPoints[powerLink.dataPointId];
      const rawValue = getDataPointValue(powerLink.dataPointId, dataPoints, opcUaNodeValues);
      const mappedValue = applyValueMapping(rawValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, dpMeta?.dataType);
    }
    return data.config?.ratingKVA ? `${data.config.ratingKVA} kVA (rated)` : 'N/A';
  }, [data.dataPointLinks, data.config?.ratingKVA, opcUaNodeValues, dataPoints]);

  interface StatusInfo {
    StatusIcon: typeof CogIcon;
    statusText: string;
    statusClasses: string;
    animationClass: string;
  }

  const { StatusIcon, statusText, statusClasses, animationClass } = useMemo<StatusInfo>((): StatusInfo => {
    let icon = CogIcon;
    let text = String(processedStatus).toUpperCase();
    let sClasses = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';
    let animClass = '';

    switch (String(processedStatus).toLowerCase()) {
      case 'fault': case 'alarm':
        icon = XCircleIcon; text = 'FAULT';
        sClasses = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = AlertTriangleIcon; text = 'WARNING';
        sClasses = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'running': case 'producing': case 'online':
        icon = CheckCircleIcon; text = (processedStatus === 'producing' || processedStatus === 'online') ? "PROD" : "RUN";
        sClasses = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400';
        animClass = 'animate-pulse'; break;
      case 'starting':
        icon = CogIcon; text = 'STARTING';
        sClasses = 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400';
        animClass = 'animate-spin'; break;
      case 'stopping':
        icon = CogIcon; text = 'STOPPING';
        sClasses = 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400';
        animClass = 'animate-spin animation-direction-reverse'; break;
      case 'offline': case 'standby':
        icon = PowerIcon; text = String(processedStatus).toUpperCase();
        sClasses = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-80'; break;
      default:
        icon = WindIcon; text = text || 'UNKNOWN';
        sClasses = 'border-gray-400 bg-gray-400/10 text-gray-500'; break;
    }
    return { StatusIcon: icon, statusText: text, statusClasses: sClasses, animationClass };
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() =>
    getDerivedStyle(data, dataPoints, opcUaNodeValues),
    [data, opcUaNodeValues, dataPoints]
  );

  const WindTurbineSymbolSVG = ({ className, isSpinning }: {className?: string, isSpinning?: boolean}) => {
    const variants = {
      spinning: { rotate: 360 },
      still: { rotate: 0 },
    };
    const transition = isSpinning ? { loop: Infinity, ease: "linear", duration: 2 } : { duration: 0.5 };

    return (
      <motion.svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        className={className}
        variants={variants}
        animate={isSpinning ? "spinning" : "still"}
        transition={transition}
      >
        <WindIcon />
      </motion.svg>
    );
  };

  const isTurbineRunning = useMemo(() =>
    ['running', 'producing', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const componentStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor || undefined,
    opacity: derivedNodeStyles.opacity || undefined,
  };

  const contentBgColor = derivedNodeStyles.backgroundColor || statusClasses.split(' ')[1];
  const contentTextColor = derivedNodeStyles.color || statusClasses.split(' ')[2];

  const mainDivClasses = `
    sld-node wind-turbine-node group custom-node-hover w-[85px] h-[90px] rounded-lg shadow-lg
    flex flex-col items-center justify-between
    border-2 ${derivedNodeStyles.borderColor ? '' : statusClasses.split(' ')[0]}
    ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
    ${animationClass && !isTurbineRunning ? animationClass : ''}
  `;

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);

  useEffect(() => {
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700);
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
  }, [processedStatus]);

  return (
    <motion.div
      className={mainDivClasses}
      style={componentStyle}
      initial="initial"
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
                id, type,
                position: { x: xPos, y: yPos },
                data, selected, dragging, zIndex,
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

      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" title="Output"/>
      <Handle type="target" position={Position.Top} id="top_control_in" isConnectable={isConnectable} className="sld-handle-style" title="Control"/>

      <div
        className={`node-content-wrapper flex flex-col items-center justify-between p-2 w-full h-full rounded-md
                    ${contentBgColor} ${contentTextColor}
                    bg-card dark:bg-neutral-800
                    ${isRecentStatusChange ? 'animate-status-highlight' : ''}`}
        style={{
          backgroundColor: derivedNodeStyles.backgroundColor || undefined,
          color: derivedNodeStyles.color || undefined,
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
          {data.label}
        </p>

        <div className="my-0.5 pointer-events-none">
          <WindTurbineSymbolSVG className="transition-colors" isSpinning={isTurbineRunning} />
        </div>

        <div className="flex items-center justify-center gap-1 mt-0.5">
          <StatusIcon size={10} className={`${animationClass && (StatusIcon === CogIcon || StatusIcon === XCircleIcon || StatusIcon === AlertTriangleIcon || StatusIcon === PowerIcon) ? animationClass : ''}`} />
          <p className="text-[9px] font-medium text-center truncate leading-tight">
            {statusText}
          </p>
        </div>
        <p className="text-[9px] leading-none" title={`Power: ${powerOutput}`}>
            {powerOutput}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(WindTurbineNode);