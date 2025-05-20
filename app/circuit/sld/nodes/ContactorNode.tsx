// components/sld/nodes/ContactorNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { ContactorNodeData } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { ToggleLeftIcon, ToggleRightIcon, AlertTriangleIcon, PowerIcon, PowerOffIcon } from 'lucide-react'; // Or custom SVG for contactor symbol

const ContactorNode: React.FC<NodeProps<ContactorNodeData>> = ({ data, selected, isConnectable }) => {
  const { isEditMode, currentUser } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const isClosed = data.status === 'closed' || data.status === 'energized'; // Or map from a datapoint if provided
  const isOpen = data.status === 'open' || data.status === 'offline' || !isClosed;

  const statusStyles = useMemo(() => {
    if (data.status === 'fault' || data.status === 'alarm') 
      return { border: 'border-destructive', bg: 'bg-destructive/10', text: 'text-destructive', Icon: PowerOffIcon };
    if (data.status === 'warning') 
      return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-500', Icon: AlertTriangleIcon };
    if (isClosed) 
      return { border: 'border-green-600', bg: 'bg-green-600/10', text: 'text-green-600', Icon: PowerIcon }; // Closed (Energized path)
    // Open or default
    return { border: 'border-neutral-400 dark:border-neutral-600', bg: 'bg-muted/30', text: 'text-muted-foreground', Icon: PowerOffIcon };
  }, [data.status, isClosed]);
  
  const contactorSymbolColor = isClosed ? "currentColor" : "currentColor"; // Can adjust based on theme

  return (
    <motion.div
      className={`
        sld-node contactor-node group w-[60px] h-[80px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1
        border-2 ${statusStyles.border} ${statusStyles.bg}
        bg-card dark:bg-neutral-800
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.04 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 300, damping: 10 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />

      <p className={`text-[9px] font-semibold text-center truncate w-full ${statusStyles.text}`} title={data.label}>
        {data.label}
      </p>
      
      {/* Simplified Contactor SVG Symbol */}
      <svg viewBox="0 0 24 24" width="30" height="30" className={`${statusStyles.text} transition-colors duration-200`}>
        <circle cx="6" cy="8" r="2" fill={contactorSymbolColor} /> 
        <circle cx="18" cy="8" r="2" fill={contactorSymbolColor} />
        <line x1="6" y1="8" x2="18" y2="8" stroke={contactorSymbolColor} strokeWidth="1.5" /> {/* Top bar */}
        
        {/* Contacts: If normally open, they show gapped by default, closed when status indicates */}
        {/* Assume NO contactor for this visual: show closed if status is 'closed'/'energized' */}
        {isClosed ? (
          <>
            <line x1="6" y1="10" x2="6" y2="16" stroke={contactorSymbolColor} strokeWidth="1.5" />
            <line x1="18" y1="10" x2="18" y2="16" stroke={contactorSymbolColor} strokeWidth="1.5" />
          </>
        ) : (
          <>
            <line x1="6" y1="10" x2="6" y2="13" stroke={contactorSymbolColor} strokeWidth="1.5" />
            <line x1="6" y1="13" x2="8" y2="15" stroke={contactorSymbolColor} strokeWidth="1.5" /> {/* Angled contact for NO */}
            <line x1="18" y1="10" x2="18" y2="16" stroke={contactorSymbolColor} strokeWidth="1.5" />
          </>
        )}
        <rect x="4" y="16" width="16" height="3" rx="1" fill={contactorSymbolColor} className="opacity-70"/> {/* Coil/Base */}
      </svg>
      
      <p className={`text-[9px] font-bold ${statusStyles.text}`}>
        {isOpen ? 'OPEN' : 'CLOSED'}
      </p>
    </motion.div>
  );
};

export default memo(ContactorNode);