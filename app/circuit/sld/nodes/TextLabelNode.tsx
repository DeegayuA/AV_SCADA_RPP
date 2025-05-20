// components/sld/nodes/TextLabelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node } from 'reactflow'; // Added Node
import { TextLabelNodeData, TextNodeStyleConfig, SLDElementType } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover';

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = ({ 
  data, 
  selected, 
  id, 
  type,
  xPos, // from NodeProps
  yPos, // from NodeProps
  // You can also destructure width, height if available and needed by popover
}) => {
  const { setNodes } = useReactFlow();
  const isEditMode = useAppStore((state) => state.isEditMode && state.currentUser?.role === 'admin');

  const nodeStyle = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (data.styleConfig?.fontSize) styles.fontSize = data.styleConfig.fontSize;
    if (data.styleConfig?.color) styles.color = data.styleConfig.color;
    if (data.styleConfig?.fontWeight) styles.fontWeight = data.styleConfig.fontWeight;
    if (data.styleConfig?.fontStyle) styles.fontStyle = data.styleConfig.fontStyle;
    if (data.styleConfig?.textAlign) styles.textAlign = data.styleConfig.textAlign;
    if (data.styleConfig?.backgroundColor) styles.backgroundColor = data.styleConfig.backgroundColor;
    if (data.styleConfig?.padding) styles.padding = data.styleConfig.padding;
    return styles;
  }, [data.styleConfig]);

  // --- MODIFIED UPDATE HANDLERS ---
  const handleStyleConfigUpdate = (newStyleConfig: TextNodeStyleConfig) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            styleConfig: { ...(n.data.styleConfig || {}), ...newStyleConfig },
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleLabelUpdate = (newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            label: newLabel,
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleTextUpdate = (newText: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: TextLabelNodeData = {
            ...n.data,
            text: newText,
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };
  // --- END MODIFIED UPDATE HANDLERS ---

  // Prepare the node object for the Popover
  const nodeForPopover: Node<TextLabelNodeData> = {
    id,
    type, // This is the ReactFlow node type string, e.g., 'textLabel'
    data, // This is TextLabelNodeData
    position: { x: xPos, y: yPos }, // Actual position from NodeProps
    selected, // Pass selection state
    // You could also add width/height if node.dimensions is available and Popover needs it
    // For instance, if NodeProps includes width and height:
    // width: props.width, 
    // height: props.height,
  };


  const NodeContent = (
    <div
      className={`
        sld-node text-label-node
        whitespace-pre-wrap leading-tight outline-none
        transition-all duration-150 ease-in-out
        ${isEditMode ? 'cursor-pointer hover:ring-1 hover:ring-blue-400/70 focus:ring-1 focus:ring-blue-500' : ''}
        ${selected && isEditMode ? 'ring-1 ring-blue-500 shadow-sm' : ''}
        ${selected && !isEditMode ? 'ring-1 ring-blue-300/30' : ''}
        ${!data.styleConfig?.padding ? 'p-1' : ''} 
        ${!data.styleConfig?.fontSize ? 'text-sm' : ''}
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''}
      `}
      style={nodeStyle}
      tabIndex={isEditMode ? 0 : -1}
    >
      {/* Handles for connectability are optional for TextLabel, shown for completeness */}
      
      {isEditMode && <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-1.5 !h-1.5" />}
     
      {data.text || data.label || 'Text Label'} {/* Display text or fallback */}
      
      {isEditMode && <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-1.5 !h-1.5" />}
     
    </div>
  );

  return (
    <TextLabelConfigPopover
      node={nodeForPopover} // Pass the constructed Node object
      onUpdateNodeStyle={handleStyleConfigUpdate}
      onUpdateNodeLabel={handleLabelUpdate}
      onUpdateNodeText={handleTextUpdate}
      isEditMode={!!isEditMode} // Ensure it's explicitly boolean
    >
      {NodeContent}
    </TextLabelConfigPopover>
  );
};

export default memo(TextLabelNode);