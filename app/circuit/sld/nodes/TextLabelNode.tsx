// components/sld/nodes/TextLabelNode.tsx
import React, { memo, useMemo, useState, useLayoutEffect, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node as ReactFlowNode } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { TextLabelNodeData, TextNodeStyleConfig, SLDElementType, DataPointLink } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover';
import { measureTextNode, getDerivedStyle, applyValueMapping, formatDisplayValue } from './nodeUtils';

const MIN_WIDTH = 20;
const MIN_HEIGHT = 20;

const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(() => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));
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

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = (props) => {
  const { 
    data, selected, id, type, xPos, yPos, dragging, zIndex, isConnectable
  } = props;

  const { setNodes } = useReactFlow();
  const { isEditMode, currentUser, globalOpcUaNodeValues, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode && state.currentUser?.role === 'admin',
    currentUser: state.currentUser,
    globalOpcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
    setSelectedElementForDetails: state.setSelectedElementForDetails, // If you want an info button later
  }));
  
  const isDarkMode = useIsDarkMode();
  const electricCyan = 'hsl(190, 95%, 50%)';
  
  const [calculatedDimensions, setCalculatedDimensions] = useState<{ width: number; height: number }>({ width: MIN_WIDTH, height: MIN_HEIGHT });

  // --- Reactive Text Content ---
  const textLink = useMemo(() => data.dataPointLinks?.find(link => link.targetProperty === 'text'), [data.dataPointLinks]);
  const textDataPointConfig = useMemo(() => textLink ? dataPoints[textLink.dataPointId] : undefined, [textLink, dataPoints]);
  const textOpcUaNodeId = useMemo(() => textDataPointConfig?.nodeId, [textDataPointConfig]);
  const reactiveTextValue = useOpcUaNodeValue(textOpcUaNodeId);

  const displayText = useMemo(() => {
    if (textLink && textDataPointConfig && reactiveTextValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveTextValue, textLink);
      return formatDisplayValue(mappedValue, textLink.format, textDataPointConfig.dataType);
    }
    return data.text || data.label || '';
  }, [textLink, textDataPointConfig, reactiveTextValue, data.text, data.label]);

  // --- Derived Styles ---
  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, any> = {};
    // Include reactive text value if its nodeId is present
    if (textOpcUaNodeId && reactiveTextValue !== undefined) {
      values[textOpcUaNodeId] = reactiveTextValue;
    }
    // Include values for any other style-related dataPointLinks
    data.dataPointLinks?.forEach(link => {
      if (link.targetProperty !== 'text') { // Already handled above for 'text'
        const dpConfig = dataPoints[link.dataPointId];
        if (dpConfig?.nodeId && globalOpcUaNodeValues.hasOwnProperty(dpConfig.nodeId)) {
          values[dpConfig.nodeId] = globalOpcUaNodeValues[dpConfig.nodeId];
        }
      }
    });
    return values;
  }, [data.dataPointLinks, dataPoints, textOpcUaNodeId, reactiveTextValue, globalOpcUaNodeValues]);
  
  const derivedNodeStyles = useMemo(() => getDerivedStyle(data, dataPoints, opcUaValuesForDerivedStyle), [data, dataPoints, opcUaValuesForDerivedStyle]);

  useLayoutEffect(() => {
    const { styleConfig = {} } = data;
    // Measurement should ideally consider the final font styles applied, whether from styleConfig or derivedNodeStyles
    // For simplicity here, we use styleConfig for measurement, as derived styles might be more for color/bg.
    // If derived styles change font size/weight, this might need refinement.
    const fontToMeasure = {
        fontFamily: styleConfig.fontFamily || 'Arial, sans-serif',
        fontSize: styleConfig.fontSize || '14px',
        fontWeight: styleConfig.fontWeight || 'normal',
        fontStyle: styleConfig.fontStyle || 'normal',
    };

    const dimensions = measureTextNode({
      text: displayText || ' ', // Use a space if text is empty for min measurement
      ...fontToMeasure,
      padding: styleConfig.padding || '4px',
    });
    
    const newWidth = Math.max(MIN_WIDTH, dimensions.width);
    const newHeight = Math.max(MIN_HEIGHT, dimensions.height);

    // Check if dimensions actually changed to prevent unnecessary re-renders/updates
    if (newWidth !== calculatedDimensions.width || newHeight !== calculatedDimensions.height) {
        setCalculatedDimensions({ width: newWidth, height: newHeight });
        
        // Update the node in React Flow store IF its current dimensions don't match.
        // This is important if React Flow itself is not aware of the auto-sized dimensions,
        // especially on initial load or if dimensions change significantly.
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === id && (n.width !== newWidth || n.height !== newHeight)) {
              return { ...n, width: newWidth, height: newHeight, style: {...(n.style || {}), width: newWidth, height: newHeight} };
            }
            return n;
          })
        );
    }
  }, [displayText, data.styleConfig, id, setNodes, calculatedDimensions.width, calculatedDimensions.height]);


  const nodeMainStyle = useMemo((): React.CSSProperties => {
    const { styleConfig = {} } = data;
    let justifyContent = 'flex-start';
    if (styleConfig.textAlign === 'center') justifyContent = 'center';
    else if (styleConfig.textAlign === 'right') justifyContent = 'flex-end';

    const baseBg = styleConfig.backgroundColor || 'transparent';
    const finalBg = derivedNodeStyles.backgroundColor || baseBg;
    
    let finalBorderColor = 'transparent'; // Default border is transparent
    if (derivedNodeStyles.borderColor) {
        finalBorderColor = derivedNodeStyles.borderColor;
    }


    let currentBoxShadow = 'none'; // Default no shadow
    if (selected) {
        currentBoxShadow = `0 0 0 1.5px ${electricCyan}`; // Simpler selection shadow for text
    }

    return {
      width: `${calculatedDimensions.width}px`,
      height: `${calculatedDimensions.height}px`,
      padding: styleConfig.padding || '4px',
      backgroundColor: finalBg,
      borderColor: finalBorderColor,
      borderWidth: (finalBorderColor && finalBorderColor !== 'transparent') ? '1px' : '0px',
      borderStyle: (finalBorderColor && finalBorderColor !== 'transparent') ? 'solid' : 'none',
      borderRadius: styleConfig.borderRadius || '4px', // Default border radius
      display: 'flex',
      alignItems: 'center', // Use center alignment as default
      justifyContent: justifyContent,
      boxShadow: currentBoxShadow,
      opacity: derivedNodeStyles.opacity ?? 1,
      cursor: isEditMode ? 'pointer' : 'default',
      transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out', // CSS transitions
    };
  }, [data, calculatedDimensions, selected, electricCyan, derivedNodeStyles, isEditMode]);

  const textSpanStyle = useMemo((): React.CSSProperties => {
    const { styleConfig = {} } = data;
    const defaultColor = isDarkMode ? '#E0E0E0' : '#202020'; // Theme-aware default
    const finalColor = derivedNodeStyles.color || styleConfig.color || defaultColor;

    return {
      fontSize: styleConfig.fontSize || '14px',
      fontWeight: styleConfig.fontWeight || 'normal',
      fontStyle: styleConfig.fontStyle || 'normal',
      fontFamily: styleConfig.fontFamily || 'Arial, sans-serif',
      color: finalColor,
      lineHeight: 'normal', // Allow line height config
      // textAlign is handled by parent's justifyContent
    };
  }, [data.styleConfig, derivedNodeStyles, isDarkMode]);

  const handleUpdateWrapper = (updater: (currentNodes: ReactFlowNode<TextLabelNodeData>[]) => ReactFlowNode<TextLabelNodeData>[]) => {
    setNodes(updater as (nodes: ReactFlowNode<any>[]) => ReactFlowNode<any>[]);
  };

  const handleStyleConfigUpdate = (newStyleConfig: Partial<TextNodeStyleConfig>) => {
    handleUpdateWrapper((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const oldData = n.data as TextLabelNodeData;
          const updatedNodeData: TextLabelNodeData = {
            ...oldData,
            styleConfig: { ...(oldData.styleConfig || {}), ...newStyleConfig },
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleTextUpdate = (newText: string) => {
    handleUpdateWrapper((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const oldData = n.data as TextLabelNodeData;
          // If primarily using reactive text, updating data.text might be for fallback or manual override
          const updatedNodeData: TextLabelNodeData = { ...oldData, text: newText };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };
  // The handleLabelUpdate would be similar if data.label is distinct from data.text for editing.
  // For simplicity, assuming TextLabelConfigPopover updates 'text'. If it needs to update 'label', add a similar handler.
  const handleLabelUpdate = (newLabel: string) => {
     handleUpdateWrapper((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const oldData = n.data as TextLabelNodeData;
          const updatedNodeData: TextLabelNodeData = { ...oldData, label: newLabel };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  }


  const nodeForPopover: ReactFlowNode<TextLabelNodeData> = {
    id, type: type || SLDElementType.TextLabel, data,
    position: { x: xPos, y: yPos },
    selected: selected || false, dragging: dragging || false, zIndex: zIndex || 0,
    width: calculatedDimensions.width, height: calculatedDimensions.height,
    connectable: isConnectable || false,
  };

  return (
    <TextLabelConfigPopover
      node={nodeForPopover}
      onUpdateNodeStyle={handleStyleConfigUpdate}
      onUpdateNodeText={handleTextUpdate} // Or separate updates for text/label
      onUpdateNodeLabel={handleLabelUpdate}
      isEditMode={!!isEditMode}
    >
      <motion.div
        className="sld-node text-label-node group" // Removed custom-node-hover, using framer's whileHover
        style={nodeMainStyle}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: nodeMainStyle.boxShadow // Ensure anirunningmat animation targets this
        }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={isEditMode && !selected ? { scale: 1.03, boxShadow: `0 0 8px 2px rgba(0,0,0,0.1)` } : undefined}
        // tabIndex={isEditMode ? 0 : -1} // Popover typically handles focus trigger
      >
        {isEditMode && (
          <>
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 sld-handle-style !bg-transparent hover:!bg-slate-400" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 sld-handle-style !bg-transparent hover:!bg-slate-400" />
            <Handle type="target" position={Position.Left} className="!w-2 !h-2 sld-handle-style !bg-transparent hover:!bg-slate-400" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 sld-handle-style !bg-transparent hover:!bg-slate-400" />
          </>
        )}
        
        <AnimatePresence mode="wait">
          <motion.p
            key={displayText} // Crucial for AnimatePresence to detect change
            style={textSpanStyle}
            className="whitespace-pre-wrap" // leading-tight removed to use configured line-height
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5, transition: {duration: 0.1} }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {displayText || (isEditMode ? '...' : '')} {/* Show placeholder dots in edit mode if empty */}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </TextLabelConfigPopover>
  );
};

export default memo(TextLabelNode);