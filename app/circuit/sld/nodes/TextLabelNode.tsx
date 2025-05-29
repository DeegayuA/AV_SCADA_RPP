// components/sld/nodes/TextLabelNode.tsx
import React, { memo, useMemo, useState, useLayoutEffect, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node } from 'reactflow'; // Added Node
import { TextLabelNodeData, TextNodeStyleConfig, SLDElementType } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover';
import { measureTextNode } from './nodeUtils'; // Import the measurement utility

const MIN_WIDTH = 20; // Minimum width for the node
const MIN_HEIGHT = 20; // Minimum height for the node

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = ({ 
  data, 
  selected, 
  id, 
  type,
  xPos, // from NodeProps
  yPos, // from NodeProps
  // React Flow will provide width and height if the node has been resized by user/fitView
  // For auto-sizing, we calculate these initially and when content/style changes.
}) => {
  const { setNodes } = useReactFlow();
  const isEditMode = useAppStore((state) => state.isEditMode && state.currentUser?.role === 'admin');
  
  const [calculatedDimensions, setCalculatedDimensions] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const { text, styleConfig = {} } = data;
    const { fontSize, fontWeight, fontStyle, fontFamily, padding } = styleConfig;

    const dimensions = measureTextNode({
      text: text || data.label || ' ', // Use a space if text and label are empty for min measurement
      fontFamily: fontFamily,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      padding: padding,
    });
    
    // Ensure minimum dimensions
    const newWidth = Math.max(MIN_WIDTH, dimensions.width);
    const newHeight = Math.max(MIN_HEIGHT, dimensions.height);

    setCalculatedDimensions({ width: newWidth, height: newHeight });

    // Optional: If React Flow isn't picking up the size change automatically from style,
    // you might need to update the node's width/height in the store.
    // This is usually not needed if the node's wrapper style is updated.
    // setNodes((nds) =>
    //   nds.map((n) => {
    //     if (n.id === id) {
    //       return { ...n, width: newWidth, height: newHeight };
    //     }
    //     return n;
    //   })
    // );

  }, [data.text, data.label, data.styleConfig, id, setNodes]);


  const nodeStyle = useMemo(() => {
    const styles: React.CSSProperties = {
        // Apply calculated dimensions if available
        width: calculatedDimensions ? `${calculatedDimensions.width}px` : undefined,
        height: calculatedDimensions ? `${calculatedDimensions.height}px` : undefined,
        // User-configurable styles
        fontSize: data.styleConfig?.fontSize || '14px', // Default if not set
        color: data.styleConfig?.color || '#000000', // Default if not set
        fontWeight: data.styleConfig?.fontWeight || 'normal',
        fontStyle: data.styleConfig?.fontStyle || 'normal',
        textAlign: data.styleConfig?.textAlign || 'left',
        backgroundColor: data.styleConfig?.backgroundColor || 'transparent',
        padding: data.styleConfig?.padding || '4px', // Default padding
        fontFamily: data.styleConfig?.fontFamily || 'Arial, sans-serif', // Default font family
        // Ensure the node itself is laid out to allow content to dictate size if width/height were 'auto'
        display: 'flex', // Useful for aligning text content with padding
        alignItems: 'center', // Default vertical alignment to center
        justifyContent: data.styleConfig?.textAlign || 'flex-start', // Map textAlign to justifyContent
    };
    if (data.styleConfig?.textAlign === 'center') styles.justifyContent = 'center';
    else if (data.styleConfig?.textAlign === 'right') styles.justifyContent = 'flex-end';
    
    return styles;
  }, [data.styleConfig, calculatedDimensions]);

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
        sld-node text-label-node node-content-wrapper group custom-node-hover /* Added node-content-wrapper, group, custom-node-hover */
        whitespace-pre-wrap leading-tight outline-none
        box-border 
        transition-all duration-150 ease-in-out /* This is also in custom-node-hover, can be reviewed */
        ${isEditMode ? 'cursor-pointer focus:ring-1 focus:ring-blue-500' : ''} /* Removed hover:ring, selected ring styles */
        /* Existing selected styles removed, will be handled by .reactflow-node.selected .node-content-wrapper */
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''} /* This might be overridden by node-content-wrapper selection style if it sets a bg */
      `}
      style={nodeStyle} // This now includes width and height
      tabIndex={isEditMode ? 0 : -1}
    >
      {/* Handles are optional and primarily for visual connection points if needed. */}
      {isEditMode && (
        <>
          <Handle type="target" position={Position.Top} className="sld-handle-style" />
          <Handle type="source" position={Position.Bottom} className="sld-handle-style" />
          <Handle type="target" position={Position.Left} className="sld-handle-style" />
          <Handle type="source" position={Position.Right} className="sld-handle-style" />
        </>
      )}
     
      {/* The actual text content. Styling is applied to the parent div. */}
      {data.text || data.label || ''}
    </div>
  );
  
  // If calculatedDimensions is null, it means the first layout effect hasn't run yet.
  // You might want to render a placeholder or nothing to avoid a flash of unstyled/unsized content.
  if (!calculatedDimensions) {
    // Render a minimal placeholder or return null until dimensions are ready
    // This helps prevent React Flow from potentially complaining about a node with no dimensions initially
    // or rendering it at 0,0 then jumping.
    // However, React Flow usually handles initial rendering gracefully if dimensions are set quickly.
    // For simplicity, we'll allow the initial render with potentially undefined dimensions in style,
    // relying on useLayoutEffect to quickly set them.
  }

  const [isRecentChange, setIsRecentChange] = useState(false);
  const prevTextRef = useRef(data.text);

  useEffect(() => {
    if (prevTextRef.current !== data.text) {
      setIsRecentChange(true);
      const timer = setTimeout(() => setIsRecentChange(false), 700); // Match animation duration
      prevTextRef.current = data.text;
      return () => clearTimeout(timer);
    }
  }, [data.text]);

  // Update NodeContent className to include animation
  const NodeContentWithAnimation = (
    <div
      className={`
        sld-node text-label-node node-content-wrapper group custom-node-hover 
        whitespace-pre-wrap leading-tight outline-none
        box-border 
        transition-all duration-150 ease-in-out 
        ${isEditMode ? 'cursor-pointer focus:ring-1 focus:ring-blue-500' : ''} 
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''}
        ${isRecentChange ? 'animate-status-highlight' : ''}
      `}
      style={nodeStyle} // This now includes width and height
      tabIndex={isEditMode ? 0 : -1}
    >
      {isEditMode && (
        <>
          <Handle type="target" position={Position.Top} className="sld-handle-style" />
          <Handle type="source" position={Position.Bottom} className="sld-handle-style" />
          <Handle type="target" position={Position.Left} className="sld-handle-style" />
          <Handle type="source" position={Position.Right} className="sld-handle-style" />
        </>
      )}
      {data.text || data.label || ''}
    </div>
  );

  return (
    // The Popover should not interfere with the node's own sizing.
    // It's an overlay triggered by interaction.
    <TextLabelConfigPopover
      node={nodeForPopover}
      onUpdateNodeStyle={handleStyleConfigUpdate}
      onUpdateNodeLabel={handleLabelUpdate}
      onUpdateNodeText={handleTextUpdate}
      isEditMode={!!isEditMode}
    >
      {NodeContentWithAnimation} {/* Use updated NodeContent */}
    </TextLabelConfigPopover>
  );
};

export default memo(TextLabelNode);