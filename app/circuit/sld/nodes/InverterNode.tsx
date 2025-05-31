// components/sld/nodes/InverterNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position, XYPosition } from 'reactflow'; // Added XYPosition for clarity
import { motion, AnimatePresence } from 'framer-motion';
import { InverterNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { ZapIcon, RefreshCwIcon, AlertTriangleIcon, InfoIcon, ArrowDown01Icon, ArrowUp01Icon, ThermometerIcon, ActivityIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Helper for theme detection
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false; 
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cb = () => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(cb);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    cb();
    return () => observer.disconnect();
  }, []);
  return isDark;
};

const InverterNode: React.FC<NodeProps<InverterNodeData>> = (props) => {
  const { 
    data, 
    selected, 
    isConnectable,
    id, 
    type, 
    xPos,      
    yPos,
    dragging, 
    zIndex
  } = props;

  const nodePosition: XYPosition = { x: xPos || 0, y: yPos || 0 };
  const nodeWidth = data.width;
  const nodeHeight = data.height;

  const isDarkMode = useIsDarkMode();

  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));
  
  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Reactive Data Points ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);
  
  const tempLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'temperature'), [data.dataPointLinks]);
  const tempDpConfig = useMemo(() => tempLink ? dataPoints[tempLink.dataPointId] : undefined, [tempLink, dataPoints]);
  const tempOpcUaNodeId = useMemo(() => tempDpConfig?.nodeId, [tempDpConfig]);
  const reactiveTempValue = useOpcUaNodeValue(tempOpcUaNodeId);

  const temperature = useMemo(() => {
    if (tempLink && tempDpConfig && reactiveTempValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveTempValue, tempLink);
      return formatDisplayValue(mappedValue, tempLink.format, tempDpConfig?.dataType);
    }
    return data.config?.operatingTemperatureRange ? null : null;
  }, [tempLink, tempDpConfig, reactiveTempValue, data.config?.operatingTemperatureRange]);


  const processedStatus = useMemo(() => {
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline';
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const acPowerOutput = useMemo(() => {
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, powerDataPointConfig?.dataType);
    }
    return data.config?.ratedPower ? `${data.config.ratedPower} kW (AC Rated)` : 'N/A';
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.ratedPower]);
  
  const numericAcPower = useMemo(() => {
    const val = parseFloat(String(acPowerOutput).replace(/[^\d.-]/g, ''));
    return isNaN(val) ? 0 : val;
  }, [acPowerOutput]);

  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-700' : 'border-slate-300';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgClass = isDarkMode ? 'bg-slate-800/70' : 'bg-white/70';
    let glowRgb = isDarkMode ? '71, 85, 105' : '148, 163, 184'; 
    
    switch (processedStatus) {
      case 'fault': case 'alarm':
        baseBorderClass = 'border-red-500 dark:border-red-500';
        iconColorClass = 'text-red-500 dark:text-red-400';
        textColorClass = 'text-red-600 dark:text-red-400';
        glowRgb = '239, 68, 68';
        break;
      case 'warning':
        baseBorderClass = 'border-amber-500 dark:border-amber-400';
        iconColorClass = 'text-amber-500 dark:text-amber-400';
        textColorClass = 'text-amber-600 dark:text-amber-400';
        glowRgb = '245, 158, 11';
        break;
      case 'running': case 'online': case 'nominal':
        baseBorderClass = 'border-sky-500 dark:border-sky-400';
        iconColorClass = isDarkMode ? 'text-sky-300' : 'text-sky-500';
        textColorClass = isDarkMode ? 'text-sky-200' : 'text-sky-700';
        glowRgb = isDarkMode ? '56, 189, 248' : '14, 165, 233';
        break;
      default: break;
    }
    return { baseBorderClass, iconColorClass, textColorClass, baseBgClass, glowColor: `rgba(${glowRgb}, 0.4)` };
  }, [processedStatus, isDarkMode]);

  const StatusIconComponent = useMemo(() => {
    if (processedStatus === 'fault' || processedStatus === 'alarm') return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if (processedStatus === 'running' || processedStatus === 'nominal' || processedStatus === 'online') return RefreshCwIcon;
    return ZapIcon;
  }, [processedStatus]);

  const isDeviceActive = useMemo(() => 
    ['running', 'nominal', 'online'].includes(String(processedStatus).toLowerCase()),
    [processedStatus]
  );

  const animationRotateDuration = useMemo(() => {
    if (!isDeviceActive || StatusIconComponent !== RefreshCwIcon) return 0;
    const baseDuration = 10;
    const minDuration = 2;
    const powerScale = data.config?.ratedPower ? data.config.ratedPower / 2 : 50;
    const speedFactor = Math.max(0, numericAcPower / Math.max(1, powerScale));
    return Math.max(minDuration, baseDuration / (1 + speedFactor));
  }, [numericAcPower, isDeviceActive, StatusIconComponent, data.config?.ratedPower]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);
  useEffect(() => {
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
  }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);
  const electricCyan = 'hsl(190, 95%, 55%)';

  const nodeMainStyle: React.CSSProperties = {
    borderColor: derivedNodeStyles.borderColor || undefined,
    boxShadow: selected 
        ? `0 0 18px 3px ${electricCyan}, 0 0 5px 1px ${electricCyan} inset` 
        : isRecentStatusChange 
          ? `0 0 16px 3px ${statusUiStyles.glowColor.replace('0.4', '0.65')}`
          : `0 0 10px 1.5px ${statusUiStyles.glowColor}`,
    minWidth: '132px',
    minHeight: '110px',
    ...(typeof nodeWidth === 'number' && { width: `${nodeWidth}px` }),
    ...(typeof nodeHeight === 'number' && { height: `${nodeHeight}px` }),
  };
  
  const fullNodeObjectForDetails = useMemo((): CustomNodeType => ({
    id,
    type: type || '', // Provide default for type if it can be undefined
    position: nodePosition, // Use the consistently derived nodePosition
    data,
    selected: selected || false,
    dragging: dragging || false,
    zIndex: zIndex || 0,
    width: typeof nodeWidth === 'number' ? nodeWidth : undefined, // Pass numeric width or undefined
    height: typeof nodeHeight === 'number' ? nodeHeight : undefined, // Pass numeric height or undefined
    connectable: isConnectable // isConnectable from props
    // Ensure connectable is removed if isConnectable is what your type expects
  }), [id, type, nodePosition, data, selected, dragging, zIndex, nodeWidth, nodeHeight, isConnectable]);


  return (
    <motion.div
      className={`
        inverter-node group sld-node relative flex flex-col items-center justify-center 
        rounded-xl border-2 backdrop-blur-md 
        ${statusUiStyles.baseBgClass} 
        ${statusUiStyles.baseBorderClass}
        transition-colors duration-300 ease-in-out
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-transparent` : ''}
      `}
      style={nodeMainStyle}
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ 
        scale: isNodeEditable ? 1.04 : 1.02,
        boxShadow: selected 
            ? `0 0 22px 4px ${electricCyan}, 0 0 7px 2px ${electricCyan} inset`
            : `0 0 20px 4px ${statusUiStyles.glowColor.replace('0.4', '0.6')}`
      }}
      onClick={(e) => {
        if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
        }
      }}
    >
      <Handle
        type="target" position={Position.Top} id="top_dc_in" 
        isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-orange-400/70 dark:!bg-orange-500/70 !border-orange-500 dark:!border-orange-400
                   !rounded-full sld-handle-style hover:!scale-125 hover:!opacity-100 transition-all duration-200"
        title="DC Input"
      >
        <ArrowDown01Icon size={10} className="text-white/80 dark:text-black/80 transition-colors duration-300"/>
      </Handle>
      <Handle
        type="source" position={Position.Bottom} id="bottom_ac_out" 
        isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-sky-400/70 dark:!bg-sky-500/70 !border-sky-500 dark:!border-sky-400
                   !rounded-full sld-handle-style hover:!scale-125 hover:!opacity-100 transition-all duration-200"
        title="AC Output"
      >
        <ArrowUp01Icon size={10} className="text-white/80 dark:text-black/80 transition-colors duration-300"/>
      </Handle>

      {!isEditMode && (
        <Button variant="ghost" size="icon" title="View Details"
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full z-20 
                     bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20
                     p-0 backdrop-blur-sm transition-colors duration-300"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedElementForDetails(fullNodeObjectForDetails);
          }}
        >
          <InfoIcon className={`h-4 w-4 text-slate-600 dark:text-slate-300 transition-colors duration-300`} />
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-center w-full h-full p-2.5 space-y-1 pointer-events-none">
        <div className="relative h-9 w-9 flex items-center justify-center mb-1">
            <AnimatePresence mode="wait">
                <motion.div
                    key={StatusIconComponent.displayName || StatusIconComponent.name}
                    initial={{ opacity: 0, rotateY: -90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    exit={{ opacity: 0, rotateY: 90 }}
                    transition={{ duration: 0.3, type: 'spring', stiffness:200, damping:15}}
                    className="absolute"
                >
                  <StatusIconComponent 
                    size={30} 
                    className={`${statusUiStyles.iconColorClass} transition-colors duration-300`} 
                  />
                </motion.div>
            </AnimatePresence>
            {isDeviceActive && StatusIconComponent === RefreshCwIcon && (
                 <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ 
                        loop: Infinity, 
                        ease: "linear", 
                        duration: animationRotateDuration 
                    }}
                  />
            )}
            {isDeviceActive && (
                <motion.div
                    className="absolute inset-[-4px] rounded-full"
                    style={{
                      border: `2px solid ${isDarkMode ? 'hsla(197, 88%, 60%, 0.4)' : 'hsla(197, 80%, 50%, 0.35)'}`
                    }}
                    animate={{ scale: [1, 1.25, 1], opacity: [isDarkMode?0.4:0.35, isDarkMode?0.7:0.6, isDarkMode?0.4:0.35] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
        
        <motion.p
          className={`text-xs font-semibold tracking-wider leading-tight text-center w-full px-1
                     ${statusUiStyles.textColorClass} transition-colors duration-300`}
          title={`Status: ${processedStatus}`}
          whileHover={{ color: isDarkMode ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 0%)' }}
        >
          {String(processedStatus).toUpperCase()}
        </motion.p>
        
        <motion.p
          className={`text-[15px] font-bold leading-tight text-center w-full px-1
                     text-slate-800 dark:text-slate-100 transition-colors duration-300`}
          title={data.label}
          whileHover={{ scale: 1.02, color: electricCyan }}
        >
          {data.label}
        </motion.p>

        <div className="flex items-center space-x-1.5 text-xs font-medium" title={`AC Power: ${acPowerOutput}`}>
            <ActivityIcon 
              size={14} 
              className={`${statusUiStyles.textColorClass} transition-colors duration-300 
                         ${isDeviceActive ? (isDarkMode ? 'text-sky-300':'text-sky-600') : ''}`} />
            <AnimatePresence mode="wait">
                <motion.span
                    key={acPowerOutput}
                    className={`${statusUiStyles.textColorClass} transition-colors duration-300 
                               ${isDeviceActive ? (isDarkMode ? '!text-sky-200':'!text-sky-600 font-semibold') : ''}`}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.25 }}
                >
                    {acPowerOutput}
                </motion.span>
            </AnimatePresence>
        </div>

        {temperature && (
            <div className="flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400 transition-colors duration-300" title={`Temperature: ${temperature}`}>
                <ThermometerIcon size={12} />
                <AnimatePresence mode="wait">
                     <motion.span key={temperature} initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                                  exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {temperature}
                    </motion.span>
                </AnimatePresence>
            </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(InverterNode);