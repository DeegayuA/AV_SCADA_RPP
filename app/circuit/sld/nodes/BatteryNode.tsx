// components/sld/nodes/BatteryNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BatteryNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { BatteryChargingIcon, BatteryFullIcon, BatteryLowIcon, BatteryMediumIcon, AlertCircleIcon } from 'lucide-react';

const BatteryNode: React.FC<NodeProps<BatteryNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );
  
  // Improved SOC/Status Logic
  const socValue = typeof data.config?.soc === 'number' ? data.config.soc : -1; // Assume SOC in config if available
  const { icon: StatusIcon, border, bg, text } = useMemo(() => {
    if (data.status === 'fault' || data.status === 'alarm') 
      return { icon: AlertCircleIcon, border: 'border-destructive', bg: 'bg-destructive/10', text: 'text-destructive' };
    if (data.status === 'warning') 
      return { icon: AlertCircleIcon, border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-500' };

    if (data.status === 'charging') 
      return { icon: BatteryChargingIcon, border: 'border-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-500 animate-pulse' };
    if (data.status === 'discharging') 
      return { icon: BatteryMediumIcon, border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-500' };
    
    if (socValue > 75) return { icon: BatteryFullIcon, border: 'border-green-600', bg: 'bg-green-600/10', text: 'text-green-600'};
    if (socValue > 40) return { icon: BatteryMediumIcon, border: 'border-lime-500', bg: 'bg-lime-500/10', text: 'text-lime-500'};
    if (socValue >= 0) return { icon: BatteryLowIcon, border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-500'};
      
    return { icon: BatteryMediumIcon, border: 'border-neutral-400', bg: 'bg-muted/30', text: 'text-muted-foreground' }; // Idle or unknown
  }, [data.status, socValue]);


  return (
    <motion.div
      className={`
        sld-node battery-node group w-[75px] h-[85px] rounded-xl shadow-lg
        flex flex-col items-center justify-between p-2 
        border-2 ${border} ${bg}
        bg-card dark:bg-neutral-800
        transition-all duration-200
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-xl' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      {/* Batteries can be sources or targets depending on context (charge/discharge) */}
      <Handle type="target" position={Position.Top} id="top_in_charge" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Charge Input"/>
      <Handle type="source" position={Position.Bottom} id="bottom_out_discharge" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" title="Discharge Output"/>
      {/* Optional: side handles if it connects to a DC bus directly */}
      <Handle type="source" position={Position.Left} id="left_dc_bus" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1" title="DC Bus"/>
      <Handle type="source" position={Position.Right} id="right_dc_bus" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1" title="DC Bus"/>


      <p className={`text-[9px] font-semibold text-center truncate w-full ${text}`} title={data.label}>
        {data.label}
      </p>
      
      <StatusIcon size={30} className={`my-1 ${text} transition-colors`} />
      
      <p className={`text-[10px] font-bold text-center ${text}`}>
        {socValue >= 0 ? `${socValue}%` : (data.status || 'Idle')}
      </p>
    </motion.div>
  );
};
export default memo(BatteryNode);