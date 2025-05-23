// components/sld/nodes/RelayNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType } from '@/types/sld'; // Or specific RelayNodeData. Added CustomNodeType
import { useAppStore } from '@/stores/appStore';
import { ShieldCheckIcon, ShieldAlertIcon, ShieldQuestionIcon, ZapIcon, InfoIcon } from 'lucide-react'; // Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface RelayNodeData extends BaseNodeData {
    config?: BaseNodeData['config'] & {
        relayType?: string; // e.g., "Overcurrent", "Differential", "Control"
        ansiCode?: string; // e.g., "50/51", "87T"
    }
}

const RelayNode: React.FC<NodeProps<RelayNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props; // Destructure all needed props
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
    let icon = ShieldQuestionIcon;
    let text = data.status || 'Idle';
    let classes = 'border-neutral-400 dark:border-neutral-600 bg-muted/20 text-muted-foreground';

    switch (data.status) {
      case 'tripped': case 'fault': case 'alarm':
        icon = ShieldAlertIcon; text = 'TRIPPED';
        classes = 'border-destructive bg-destructive/10 text-destructive'; break;
      case 'warning':
        icon = ShieldAlertIcon; text = 'Warning';
        classes = 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'; break;
      case 'active': case 'picked_up': // Control relay active state
        icon = ZapIcon; text = 'ACTIVE';
        classes = 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'; break;
      case 'nominal': case 'healthy': case 'ready':
        icon = ShieldCheckIcon; text = 'READY';
        classes = 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'; break;
      case 'offline':
        icon = ShieldQuestionIcon; text = 'Offline';
        classes = 'border-neutral-500 bg-neutral-500/10 text-neutral-500 opacity-70'; break;
    }
    return { DisplayIcon: icon, statusText: text, styleClasses: classes };
  }, [data.status]);
  
  const relayDisplayType = data.config?.ansiCode || data.config?.relayType || 'Relay';

  return (
    <motion.div
      className={`
        sld-node relay-node group w-[75px] h-[70px] rounded-md shadow-md
        flex flex-col items-center justify-between p-1.5
        border-2 ${styleClasses}
        bg-card dark:bg-neutral-800 text-foreground
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      variants={{ hover: { scale: isNodeEditable ? 1.03 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
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
                id, type, position, data, selected, dragging, zIndex, width, height,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* Relays usually have multiple connections: Power, CT/PT inputs, Trip Output */}
      <Handle type="target" position={Position.Top} id="power_in" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-red-400" title="Power"/>
      <Handle type="target" position={Position.Left} id="ct_pt_in" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-yellow-400" title="Measurement Inputs"/>
      <Handle type="source" position={Position.Right} id="trip_out" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-orange-400" title="Trip/Control Output"/>
      <Handle type="source" position={Position.Bottom} id="comms_out" isConnectable={isConnectable} className="!w-2 !h-2 sld-handle-style !bg-blue-400" title="Communication"/>


      <p className="text-[9px] font-semibold text-center truncate w-full" title={data.label}>
        {data.label}
      </p>
      
      <DisplayIcon size={24} className="my-0.5 transition-colors" />
      
      <p className="text-[8px] font-medium text-center truncate w-full leading-tight" title={relayDisplayType}>
        {relayDisplayType}
      </p>
    </motion.div>
  );
};

export default memo(RelayNode);