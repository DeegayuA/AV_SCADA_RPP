// components/sld/nodes/TextLabelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position, useReactFlow } from 'reactflow';
import { TextLabelNodeData, TextNodeStyleConfig, CustomNodeType, SLDElementType } from '@/types/sld';
import { useAppStore } from '@/stores/appStore'; // For edit mode
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover'; // Import the popover

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = ({ data, selected, id, type }) => {
  const { setNodes } = useReactFlow();
  const isEditMode = useAppStore((state) => state.isEditMode && state.currentUser?.role === 'admin'); // More specific check

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

  const handleUpdateStyle = (newStyleConfig: TextNodeStyleConfig | { text?: string, label?: string }) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Create a new data object to ensure React Flow detects the change
          const updatedData: TextLabelNodeData = {
            ...node.data, // existing data
            label: 'label' in newStyleConfig && typeof newStyleConfig.label === 'string' ? newStyleConfig.label : node.data.label,
            text: 'text' in newStyleConfig && typeof newStyleConfig.text === 'string' ? newStyleConfig.text : node.data.text,
            styleConfig: { // Merge with existing or new style config
              ...(node.data.styleConfig || {}),
              ...('fontSize' in newStyleConfig ? newStyleConfig : {}), // a bit verbose to separate style props from text/label
            },
          };
          // More precise merge for styleConfig only if not label/text
          if (!('text' in newStyleConfig) && !('label' in newStyleConfig)) {
             updatedData.styleConfig = {
                ...(node.data.styleConfig || {}),
                ...newStyleConfig as TextNodeStyleConfig
             }
          }

          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      })
    );
  };

  // The div that will trigger and anchor the popover
  const NodeContent = (
    <div
      className={`
        sld-node text-label-node
        whitespace-pre-wrap leading-tight outline-none // leading-tight helps with padding
        transition-all duration-150 ease-in-out
        ${isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-blue-400/70 focus:ring-2 focus:ring-blue-500' : ''}
        ${selected && isEditMode ? 'ring-2 ring-blue-500 shadow-md' : ''}
        ${selected && !isEditMode ? 'ring-1 ring-blue-300/50' : ''}
        ${!data.styleConfig?.padding ? 'p-1' : ''} // Default padding if none set
        ${!data.styleConfig?.fontSize ? 'text-sm' : ''} // Default font size if none set
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''}
      `}
      style={nodeStyle}
      tabIndex={isEditMode ? 0 : -1} // For keyboard focus
    >
      {/* Add handles if you want labels to be connectable - for text labels usually not needed */}
      {isEditMode && <Handle type="target" position={Position.Top} className="!bg-teal-500 w-2 h-2" />}
      {data.text || data.label || 'Text Label'}
      {isEditMode && <Handle type="source" position={Position.Bottom} className="!bg-rose-500 w-2 h-2" />}
    </div>
  );

  // Text labels typically don't have functional handles for connections,
  // but if they did, you'd manage their visibility in edit mode.
  // For pure text, we remove handles completely or only show them contextually if needed.

  return (
    <TextLabelConfigPopover
      node={{ 
        id, 
        data, 
        type,
        position: { x: 0, y: 0 } // Adding required position property
      }}
      elementType={SLDElementType.TextLabel} // Pass elementType as a separate prop
      onUpdateNodeStyle={handleUpdateStyle}
      isEditMode={!!isEditMode} // Ensure boolean
    >
      {NodeContent}
    </TextLabelConfigPopover>
  );
};

export default memo(TextLabelNode);