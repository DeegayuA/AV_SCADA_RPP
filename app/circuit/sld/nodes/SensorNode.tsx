// components/sld/nodes/SensorNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow'; // Reverted to NodeProps
import { motion } from 'framer-motion';
import { SensorNodeData, CustomNodeType } from '@/types/sld'; // Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { ThermometerIcon, WindIcon, DropletsIcon, GaugeIcon, RssIcon, ScanEyeIcon, InfoIcon } from 'lucide-react'; // Example icons. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

const SensorNode: React.FC<NodeProps<SensorNodeData>> = (props) => { // Reverted to NodeProps
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props;
  const width = undefined;
  const height = undefined;
  const { isEditMode, currentUser, opcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({ // Added opcUaNodeValues, dataPoints
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    opcUaNodeValues: state.opcUaNodeValues, // Added
    dataPoints: state.dataPoints, // Added
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const { DisplayIcon, statusText, styleClasses } = useMemo(() => {
    let icon = ScanEyeIcon; // Default sensor icon
    let text = data.status || 'N/A';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';

    // Icon based on sensorType from config
    const sType = data.config?.sensorType?.toLowerCase();
    if (sType?.includes('temp')) icon = ThermometerIcon;
    else if (sType?.includes('wind')) icon = WindIcon;
    else if (sType?.includes('flow') || sType?.includes('liquid')) icon = DropletsIcon;
    else if (sType?.includes('pressure') || sType?.includes('level')) icon = GaugeIcon;
    else if (sType?.includes('signal') || sType?.includes('wireless')) icon = RssIcon;


    switch (data.status) {
      case 'fault': case 'alarm':
        text = 'FAULT';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning': case 'out_of_range':
        text = 'Warning';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'reading': case 'ok': case 'nominal':
        text = 'OK'; // dataPointLink will show actual value
        classes = 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'; break;
      case 'offline':
        text = 'Offline';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-70'; break;
    }
    return { DisplayIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status, data.config?.sensorType]);

  const [isRecentStatusChange, setIsRecentStatusChange] = useState(false);
  const prevStatusRef = useRef(data.status);

  useEffect(() => {
    if (prevStatusRef.current !== data.status) {
      setIsRecentStatusChange(true);
      const timer = setTimeout(() => setIsRecentStatusChange(false), 700); // Match animation duration
      prevStatusRef.current = data.status;
      return () => clearTimeout(timer);
    }
  }, [data.status]);

  return (
    <motion.div
      className={`
        sld-node sensor-node group custom-node-hover w-[80px] h-[65px] rounded-lg shadow-md
        flex flex-col items-center justify-between /* p-1.5 removed, moved to content wrapper */
        border-2 ${styleClasses.split(' ')[0]} /* Keep only border class */
        /* bg-card, text-foreground and specific bg/text from styleClasses removed, moved to content wrapper */
        /* transition-all duration-150 is part of custom-node-hover */
        /* selected ring styles removed */
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        /* hover:shadow-lg removed */
      `}
      // variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }} // Prefer CSS hover
      // whileHover="hover" // Prefer CSS hover
      initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
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
                width: width === null ? undefined : width, 
                height: height === null ? undefined : height, 
                connectable: isConnectable,
                dragging: !!dragging, // Ensure dragging is boolean
                zIndex: zIndex || 0,   // Ensure zIndex is number
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Handles are outside node-content-wrapper */}
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="sld-handle-style !-mt-1" title="Power In"/>
      <Handle type="source" position={Position.Bottom} id="signal_out" isConnectable={isConnectable} className="sld-handle-style !-mb-1" title="Signal Out"/>

      {/* node-content-wrapper for selection styles, padding, and internal layout */}
      <div className={`
          node-content-wrapper flex flex-col items-center justify-between p-1.5 w-full h-full rounded-md
          ${styleClasses.substring(styleClasses.indexOf(' ') + 1)} /* Keep only bg and text from styleClasses */
          bg-card dark:bg-neutral-800 text-foreground /* Base background and text */
          ${isRecentStatusChange ? 'animate-status-highlight' : ''}
        `}
      >
        <p className="text-[9px] font-medium text-center truncate w-full" title={data.label}>
          {data.label} {/* Text color will be inherited */}
        </p>
        
        <DisplayIcon size={20} className="my-0.5 transition-colors" /> {/* Icon color will be inherited */}
        
        <p className="text-[8px] font-normal text-center truncate w-full leading-tight">
          {statusText} {/* Text color will be inherited */}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(SensorNode);