// components/sld/nodes/PanelNode.tsx
import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelNodeData, CustomNodeType } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { applyValueMapping, formatDisplayValue, getDerivedStyle } from './nodeUtils';
import { SunIcon, AlertTriangleIcon, InfoIcon, ZapOffIcon, PowerIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Helper for theme detection (ensure this accurately reflects your app's theme state)
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    // Ensure initial state is correct even if observer hasn't fired
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false; // Default if SSR or window not available
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cb = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(cb);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    // Call immediately in case the class was set before this effect ran
    cb(); 
    
    return () => observer.disconnect();
  }, []);
  return isDark;
};


interface ExtendedNodeProps extends Omit<NodeProps<PanelNodeData>, 'xPos' | 'yPos'> {
  xPos?: number;
  yPos?: number;
  // width & height are already part of NodeProps, but can be undefined if not set by layout engine
}

const PanelNode: React.FC<ExtendedNodeProps> = (props) => {
  const { data, selected, isConnectable, id, type, position, /* zIndex, dragging, width, height are in props */ } = props;
  const xPos = position?.x; // For details button
  const yPos = position?.y; // For details button

  const isDarkMode = useIsDarkMode();

  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
  }));

  const isNodeEditable = useMemo(() => isEditMode && currentUser?.role === 'admin', [isEditMode, currentUser]);

  // --- Reactive Data Points (condensed) ---
  const statusLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'status'), [data.dataPointLinks]);
  const statusDataPointConfig = useMemo(() => statusLink ? dataPoints[statusLink.dataPointId] : undefined, [statusLink, dataPoints]);
  const statusOpcUaNodeId = useMemo(() => statusDataPointConfig?.nodeId, [statusDataPointConfig]);
  const reactiveStatusValue = useOpcUaNodeValue(statusOpcUaNodeId);

  const powerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'powerOutput'), [data.dataPointLinks]);
  const powerDataPointConfig = useMemo(() => powerLink ? dataPoints[powerLink.dataPointId] : undefined, [powerLink, dataPoints]);
  const powerOpcUaNodeId = useMemo(() => powerDataPointConfig?.nodeId, [powerDataPointConfig]);
  const reactivePowerValue = useOpcUaNodeValue(powerOpcUaNodeId);

  const animationPowerLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'panel.powerGeneration'), [data.dataPointLinks]);
  const animationPowerDataPointConfig = useMemo(() => animationPowerLink ? dataPoints[animationPowerLink.dataPointId] : undefined, [animationPowerLink, dataPoints]);
  const animationPowerOpcUaNodeId = useMemo(() => animationPowerDataPointConfig?.nodeId, [animationPowerDataPointConfig]);
  const reactiveAnimationPowerValue = useOpcUaNodeValue(animationPowerOpcUaNodeId);
  
  const processedStatus = useMemo(() => { /* ... as before ... */ 
    if (statusLink && statusDataPointConfig && reactiveStatusValue !== undefined) {
      return applyValueMapping(reactiveStatusValue, statusLink);
    }
    return data.status || 'offline';
  }, [statusLink, statusDataPointConfig, reactiveStatusValue, data.status]);

  const powerOutput = useMemo(() => { /* ... as before ... */
    if (powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      return formatDisplayValue(mappedValue, powerLink.format, powerDataPointConfig?.dataType);
    }
    return data.config?.powerRatingWp ? `${data.config.powerRatingWp} Wp (rated)` : 'N/A';
  }, [powerLink, powerDataPointConfig, reactivePowerValue, data.config?.powerRatingWp]);

  const numericAnimationPower = useMemo(() => { /* ... as before ... */ 
    let powerForAnimation: number | undefined = undefined;
    if (animationPowerLink && animationPowerDataPointConfig && reactiveAnimationPowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveAnimationPowerValue, animationPowerLink);
      if (typeof mappedValue === 'number') powerForAnimation = mappedValue;
      else if (typeof mappedValue === 'string') { const parsed = parseFloat(mappedValue); if (!isNaN(parsed)) powerForAnimation = parsed; }
      else if (typeof mappedValue === 'boolean') powerForAnimation = mappedValue ? (data.config?.powerRatingWp || 100) : 0;
    }
    if (powerForAnimation === undefined && powerLink && powerDataPointConfig && reactivePowerValue !== undefined) {
      const mappedValue = applyValueMapping(reactivePowerValue, powerLink);
      if (typeof mappedValue === 'number') powerForAnimation = mappedValue;
      else if (typeof mappedValue === 'string') { const parsed = parseFloat(mappedValue); if (!isNaN(parsed)) powerForAnimation = parsed; }
      else if (typeof mappedValue === 'boolean') powerForAnimation = mappedValue ? (data.config?.powerRatingWp || 100) : 0;
    }
    return Math.max(0, powerForAnimation ?? 0);
  }, [animationPowerLink, animationPowerDataPointConfig, reactiveAnimationPowerValue, powerLink, powerDataPointConfig, reactivePowerValue, data.config?.powerRatingWp]);


  // --- THEME TRANSITION: statusStyles now return Tailwind classes primarily ---
  const statusUiStyles = useMemo(() => {
    let baseBorderClass = isDarkMode ? 'border-slate-700' : 'border-slate-300';
    let iconColorClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    let textColorClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    let baseBgClass = isDarkMode ? 'bg-slate-800/70' : 'bg-white/70'; // With opacity for backdrop
    let glowRgb = isDarkMode ? '71, 85, 105' : '148, 163, 184'; // slate-500 / slate-400 for boxShadow

    switch (processedStatus) {
      case 'alarm': case 'fault':
        baseBorderClass = 'border-red-500 dark:border-red-500'; // Stays same or explicitly set
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
      case 'nominal': case 'producing': case 'online':
        baseBorderClass = 'border-green-500 dark:border-green-400';
        iconColorClass = numericAnimationPower > 0 
          ? (isDarkMode ? 'text-yellow-400' : 'text-yellow-500') 
          : (isDarkMode ? 'text-green-400' : 'text-green-500');
        textColorClass = isDarkMode ? 'text-green-300' : 'text-green-700';
        glowRgb = numericAnimationPower > 0 
          ? (isDarkMode ? '250, 204, 21' : '234, 179, 8') // yellow
          : (isDarkMode ? '74, 222, 128' : '34, 197, 94'); // green
        break;
      default: break;
    }
    return { baseBorderClass, iconColorClass, textColorClass, baseBgClass, glowColor: `rgba(${glowRgb}, 0.4)` };
  }, [processedStatus, numericAnimationPower, isDarkMode]);

  const StatusIconComponent = useMemo(() => { /* ... as before ... */ 
    if (processedStatus === 'fault' || processedStatus === 'alarm') return AlertTriangleIcon;
    if (processedStatus === 'warning') return AlertTriangleIcon;
    if ((processedStatus === 'offline' || processedStatus === 'standby') && numericAnimationPower <= 0) return ZapOffIcon;
    if (numericAnimationPower > 0) return SunIcon;
    return PowerIcon;
  }, [processedStatus, numericAnimationPower]);

  const canAnimateIconPulse = useMemo(() => {/* ... as before ... */ 
    return numericAnimationPower > 0 && StatusIconComponent === SunIcon && !['fault', 'alarm', 'warning', 'offline', 'standby'].includes(processedStatus);
  },[numericAnimationPower, StatusIconComponent, processedStatus]);

  const animationPulseDuration = useMemo(() => { /* ... as before ... */ 
    if (!canAnimateIconPulse) return 2.5;
    const baseDuration = 3.0;
    const minDuration = 0.6;
    const powerScaleForSpeed = data.config?.powerRatingWp ? (data.config.powerRatingWp / 2.5) : 200;
    const speedFactor = Math.max(0, numericAnimationPower / Math.max(1, powerScaleForSpeed));
    return Math.max(minDuration, baseDuration / (1 + speedFactor * 2));
  }, [numericAnimationPower, canAnimateIconPulse, data.config?.powerRatingWp]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(processedStatus);
  useEffect(() => { /* ... as before ... */
    if (prevStatusRef.current !== processedStatus) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 1200);
      prevStatusRef.current = processedStatus;
      return () => clearTimeout(timer);
    }
   }, [processedStatus]);

  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, {}, globalOpcUaNodeValues), [data, dataPoints, globalOpcUaNodeValues]);
  const electricCyan = 'hsl(190, 95%, 55%)';

  // THEME TRANSITION: boxShadow is dynamic and Framer Motion handles its transitions.
  // borderColor is handled by Tailwind classes + CSS transition.
  // Background color is also handled by Tailwind classes + CSS transition.
  const nodeMainStyle: React.CSSProperties = {
    // derivedNodeStyles.borderColor could override Tailwind, so ensure it's compatible with CSS transitions if set
    borderColor: derivedNodeStyles.borderColor || undefined, // Let Tailwind class take precedence
    boxShadow: selected 
        ? `0 0 18px 3px ${electricCyan}, 0 0 5px 1px ${electricCyan} inset` 
        : isRecentStatusChange 
          ? `0 0 16px 3px ${statusUiStyles.glowColor.replace('0.4', '0.65')}` // Brighter pulse
          : `0 0 10px 1.5px ${statusUiStyles.glowColor}`, // Regular glow
    minWidth: '128px',
    minHeight: '100px',
    // width/height can be set by React Flow layout engine or props
    ...(props.width && { width: `${props.width}px` }),
    ...(props.height && { height: `${props.height}px` }),
  };
  
  // Framer motion 'transition' prop for properties animated by Framer.
  // CSS 'transition-colors duration-300' on className for Tailwind controlled colors.
  return (
    <motion.div
      className={`
        panel-node group sld-node relative flex flex-col items-center justify-center 
        rounded-xl border-2 backdrop-blur-md 
        ${statusUiStyles.baseBgClass} 
        ${statusUiStyles.baseBorderClass}
        transition-colors duration-300 ease-in-out /* Key for smooth theme color changes */
        ${isNodeEditable ? 'cursor-grab' : 'cursor-pointer'}
        ${selected ? `ring-2 ring-offset-2 ring-[${electricCyan}] dark:ring-[${electricCyan}] ring-offset-transparent` : ''} 
      `}
      style={nodeMainStyle} // Framer handles transitions for `boxShadow` here if it changes.
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      // This transition is for initial mount/unmount and hover (for scale and Framer-animated boxShadow)
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ 
        scale: isNodeEditable ? 1.04 : 1.02,
        boxShadow: selected 
            ? `0 0 22px 4px ${electricCyan}, 0 0 7px 2px ${electricCyan} inset`
            : `0 0 20px 4px ${statusUiStyles.glowColor.replace('0.4', '0.6')}` // More intense glow on hover
      }}
      onClick={(e) => { /* ... as before ... */ 
         if (!isNodeEditable && !isEditMode) {
            e.stopPropagation();
            setSelectedElementForDetails({
                id, type, position: props.position, data, 
                selected: props.selected, dragging: props.dragging, zIndex: props.zIndex, 
                width: props.width, height: props.height, connectable: props.connectable
            } as CustomNodeType);
        }
      }}
    >
      {/* THEME TRANSITION: Handle colors will transition via Tailwind classes and CSS transition */}
      <Handle
        type="target" position={Position.Top} id="top_in" isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-sky-400/70 dark:!bg-sky-600/70 !border-sky-500 dark:!border-sky-400
                   !rounded-full sld-handle-style hover:!scale-125 hover:!opacity-100 transition-all duration-200"
        title="DC Input"
      />
      <Handle
        type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable}
        className="!w-3.5 !h-3.5 !bg-sky-400/70 dark:!bg-sky-600/70 !border-sky-500 dark:!border-sky-400
                   !rounded-full sld-handle-style hover:!scale-125 hover:!opacity-100 transition-all duration-200"
        title="DC Output"
      />

      {/* THEME TRANSITION: Info button BG and icon color transition via Tailwind classes */}
      {!isEditMode && (
        <Button
          variant="ghost" size="icon" title="View Details"
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full z-20 
                     bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20
                     p-0 backdrop-blur-sm transition-colors duration-300" // Added transition-colors
          onClick={(e) => { /* ... as before ... */ 
             e.stopPropagation();
             setSelectedElementForDetails({
                id, type, position: props.position, data,
                selected: props.selected, dragging: props.dragging, zIndex: props.zIndex, 
                width: props.width, height: props.height, connectable: props.connectable
            } as CustomNodeType);
           }}
        >
          <InfoIcon className={`h-4 w-4 text-slate-600 dark:text-slate-300 transition-colors duration-300`} /> {/* Added transition-colors */}
        </Button>
      )}
      
      <div className="flex flex-col items-center justify-center w-full h-full p-2.5 space-y-1 pointer-events-none">
        <div className="relative h-9 w-9 flex items-center justify-center mb-1">
            <AnimatePresence mode="wait">
                <motion.div
                    key={StatusIconComponent.displayName || StatusIconComponent.name}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.25 }}
                    className="absolute"
                >
                    {/* THEME TRANSITION: Icon color from statusUiStyles.iconColorClass, transitions via CSS */}
                    <StatusIconComponent 
                        size={30}
                        className={`${statusUiStyles.iconColorClass} transition-colors duration-300`} // Added transition-colors
                    />
                </motion.div>
            </AnimatePresence>
            {StatusIconComponent === SunIcon && canAnimateIconPulse && (
                <motion.div
                    className="absolute inset-0 rounded-full" // Removed opacity-40, use rgba in style
                    style={{
                        backgroundImage: `radial-gradient(${isDarkMode ? 'rgba(250, 204, 21, 0.3)' : 'rgba(234, 179, 8, 0.25)'} 0%, transparent 70%)`
                        // THEME TRANSITION: The backgroundImage itself won't transition smoothly with CSS 'transition-all'.
                        // If a super smooth radial gradient transition is needed, it's complex. Often, a cross-fade or opacity
                        // change on two overlaid elements (one for light, one for dark) is a simpler approach,
                        // or accept that this part might swap more directly.
                        // For now, the opacity animation helps.
                    }}
                    animate={{ scale: [1, 1.3, 1], opacity: [isDarkMode ? 0.35:0.3, isDarkMode? 0.65:0.5, isDarkMode? 0.35:0.3] }}
                    transition={{ duration: animationPulseDuration, repeat: Infinity, ease: "circOut" }}
                />
            )}
        </div>
        
        {/* THEME TRANSITION: Text colors transition via Tailwind classes */}
        <motion.p
          className={`text-xs font-semibold tracking-wider leading-tight text-center w-full px-1
                     ${statusUiStyles.textColorClass} transition-colors duration-300`}
          title={`Status: ${processedStatus}`}
          whileHover={{ color: isDarkMode ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 0%)' }} // Ensure hover respects theme transitions
        >
          {String(processedStatus).toUpperCase()}
        </motion.p>
        
        <motion.p
          className={`text-[15px] font-bold leading-tight text-center w-full px-1
                     text-slate-800 dark:text-slate-100 transition-colors duration-300`} // Generic theme text color
          title={data.label}
          whileHover={{ scale: 1.02, color: electricCyan }}
        >
          {data.label}
        </motion.p>

        <div className="flex items-center space-x-1.5 text-xs font-medium" title={`Power: ${powerOutput}`}>
            {/* THEME TRANSITION: Icon color from statusUiStyles.textColorClass */}
            <TrendingUpIcon 
                size={14} 
                className={`${statusUiStyles.textColorClass} transition-colors duration-300 
                           ${numericAnimationPower > 0 && (StatusIconComponent === SunIcon || StatusIconComponent === PowerIcon) ? (isDarkMode ? 'text-yellow-400':'text-yellow-600') : ''}`} 
            />
            <AnimatePresence mode="wait">
                <motion.span
                    key={powerOutput}
                    // THEME TRANSITION: Text color from statusUiStyles.textColorClass
                    className={`${statusUiStyles.textColorClass} transition-colors duration-300 
                               ${numericAnimationPower > 0 && (StatusIconComponent === SunIcon || StatusIconComponent === PowerIcon) ? (isDarkMode ? '!text-yellow-300':'!text-yellow-600 font-semibold') : ''}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.25 }}
                >
                    {powerOutput}
                </motion.span>
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(PanelNode);