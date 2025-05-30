// components/sld/nodes/DataLabelNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position, useReactFlow, Node as ReactFlowNode } from 'reactflow'; // Reverted, added ReactFlowNode for clarity
import { motion } from 'framer-motion';
import { CustomNodeType, DataPointLink, DataPoint, TextLabelNodeData as TextLabelNodeDataType } from '@/types/sld'; // Added CustomNodeType, TextLabelNodeData
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { 
    getDataPointValue, 
    applyValueMapping, 
    formatDisplayValue,
    getDerivedStyle // We can use this for dynamic styling of the label itself
} from './nodeUtils'; 
import { TextIcon, InfoIcon } from 'lucide-react'; // Generic icon for a data label. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button
import { TextLabelConfigPopover } from '../ui/TextLabelConfigPopover'; // Assuming this is the correct path

// Renamed interface to avoid conflict with the component name if it was also DataLabelNodeData
interface DataLabelNodeType extends Omit<TextLabelNodeDataType, 'elementType'> { // Inherits from TextLabelNodeData which has styleConfig, label, text
  elementType: 'dataLabel'; 
  dataPointLinks?: DataPointLink[]; // Specific to DataLabelNode
}


const DataLabelNode: React.FC<NodeProps<DataLabelNodeType>> = (props) => { // Reverted to NodeProps, used new interface
  const { data, selected, isConnectable, id, type, xPos, yPos, zIndex, dragging } = props; // Fixed destructuring
  const position = { x: xPos, y: yPos }; // Create position object from xPos and yPos
  const { setNodes } = useReactFlow(); // Added for direct updates if TextLabelConfigPopover is used
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode && state.currentUser?.role === 'admin', // Combined admin check
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints, 
  }));
  
  // Get OPC UA node values from app store instead of using the hook directly
  const { opcUaNodeValues } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
  }));

  // --- Main Display DataPointLink Handling (Reverted to use opcUaNodeValues from store for simplicity, as this node doesn't use useOpcUaNodeValue hook yet)
  const mainDisplayLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'text'),
    [data.dataPointLinks]
  );

  const { displayText, unitText } = useMemo(() => {
    if (mainDisplayLink && dataPoints && dataPoints[mainDisplayLink.dataPointId] && opcUaNodeValues) {
      const dpMeta = dataPoints[mainDisplayLink.dataPointId] as DataPoint;
      const rawValue = getDataPointValue(mainDisplayLink.dataPointId, dataPoints, opcUaNodeValues);
      const mappedValue = applyValueMapping(rawValue, mainDisplayLink);
      const formattedText = formatDisplayValue(mappedValue, mainDisplayLink.format, dpMeta?.dataType);
      const unit = mainDisplayLink.format?.suffix || dpMeta?.unit || '';
      return { displayText: formattedText, unitText: unit };
    }
    return { displayText: data.text || data.label || '---', unitText: '' };
  }, [mainDisplayLink, data.label, data.text, opcUaNodeValues, dataPoints]);


  // Derive dynamic styles (e.g., color based on value, visibility)
  // For DataLabelNode, this might be less common unless its text color/visibility is data-driven
  const derivedNodeStyles = useMemo(() => 
    getDerivedStyle(data, dataPoints, opcUaNodeValues), // Correct parameter order: data, dataPoints, primaryOpcUaValues, globalOpcUaNodeValues
    [data, opcUaNodeValues, dataPoints]
  );

  // Combine static styles from data.styleConfig with derived dynamic styles
  const finalNodeStyle = useMemo(() => {
    const staticStyles: React.CSSProperties = {
        padding: '4px 8px',
        fontSize: '11px',
        lineHeight: '1.3',
        color: 'var(--foreground)',
        backgroundColor: 'var(--card-muted)',
        textAlign: data.styleConfig?.textAlign || 'left',
        minWidth: '50px',
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
    };
    if (data.styleConfig) {
        if (data.styleConfig.fontSize) staticStyles.fontSize = data.styleConfig.fontSize;
        if (data.styleConfig.color) staticStyles.color = data.styleConfig.color;
        if (data.styleConfig.fontWeight) staticStyles.fontWeight = String(data.styleConfig.fontWeight);
        if (data.styleConfig.fontStyle) staticStyles.fontStyle = data.styleConfig.fontStyle;
        if (data.styleConfig.backgroundColor) staticStyles.backgroundColor = data.styleConfig.backgroundColor;
        if (data.styleConfig.padding) staticStyles.padding = data.styleConfig.padding;
        if (data.styleConfig.fontFamily) staticStyles.fontFamily = data.styleConfig.fontFamily;
    }
    return { ...staticStyles, ...derivedNodeStyles };
  }, [data.styleConfig, derivedNodeStyles]);

  const showHandles = isConnectable && isEditMode; // Show handles only if connectable & in edit mode

  const nodeForPopover: ReactFlowNode<DataLabelNodeType> = { // Use ReactFlowNode for clarity
    id,
    type,
    data,
    position: position,
    selected,
    dragging: !!dragging,
    zIndex: zIndex || 0,
    // connectable: isConnectable, // This property is part of NodeProps, not Node directly
  };
  
  // --- MODIFIED UPDATE HANDLERS for TextLabelConfigPopover ---
  const handleStyleConfigUpdate = (newStyleConfig: TextLabelNodeDataType['styleConfig']) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { // Use correct type
            ...n.data,
            styleConfig: { ...(n.data.styleConfig || {}), ...newStyleConfig },
          };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };

  const handleLabelUpdate = (newLabel: string) => { // For the 'label' field if it exists
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { ...n.data, label: newLabel };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };
  
  const handleTextUpdate = (newText: string) => { // For the 'text' field
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const updatedNodeData: DataLabelNodeType = { ...n.data, text: newText };
          return { ...n, data: updatedNodeData };
        }
        return n;
      })
    );
  };


  const NodeContent = (
    <div
      className={`
        sld-node data-label-node node-content-wrapper group custom-node-hover /* Added node-content-wrapper, group, custom-node-hover */
        whitespace-pre-wrap leading-tight outline-none
        transition-all duration-150 ease-in-out /* This is also in custom-node-hover, can be reviewed */
        ${isEditMode ? 'cursor-pointer focus:ring-1 focus:ring-blue-500' : ''} /* Removed hover:ring, selected ring styles */
        /* Existing selected styles removed, will be handled by .reactflow-node.selected .node-content-wrapper */
        ${!data.styleConfig?.padding ? 'p-1' : ''} 
        ${!data.styleConfig?.fontSize ? 'text-sm' : ''}
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''} /* This might be overridden by node-content-wrapper selection style if it sets a bg */
      `}
      style={finalNodeStyle}
      tabIndex={isEditMode ? 0 : -1}
    >
      {showHandles && <Handle type="target" position={Position.Top} className="sld-handle-style" />}
      {/* For DataLabelNode, displayText (from DataPointLink or fallback) is primary */}
      {data.label && <span className="font-medium whitespace-nowrap opacity-90 mr-1">{data.label}:</span>}
      <span className="font-semibold font-mono whitespace-nowrap">{displayText}</span>
      {unitText && <span className="text-[0.9em] opacity-70 whitespace-nowrap ml-0.5">{unitText}</span>}
      {showHandles && <Handle type="source" position={Position.Bottom} className="sld-handle-style" />}
    </div>
  );

  // The outer structure for DataLabelNode usually doesn't need to be a motion.div itself unless specific animations are planned for the entire node block
  // If hover/selection effects are primarily on NodeContent, the outer fragment is fine.
  // For consistency with other nodes that have an outer motion.div for layout or effects, one could be added,
  // but TextLabel/DataLabel are often styled more like content blocks.
  // The current structure with NodeContent receiving hover/selection styles is fine.

  const [isRecentChange, setIsRecentChange] = useState(false);
  const prevDisplayValueRef = useRef(displayText);

  useEffect(() => {
    if (prevDisplayValueRef.current !== displayText) {
      setIsRecentChange(true);
      const timer = setTimeout(() => setIsRecentChange(false), 700); // Match animation duration
      prevDisplayValueRef.current = displayText;
      return () => clearTimeout(timer);
    }
  }, [displayText]);

  // Update NodeContent className to include animation
  const NodeContentWithAnimation = (
    <div
      className={`
        sld-node data-label-node node-content-wrapper group custom-node-hover 
        whitespace-pre-wrap leading-tight outline-none
        transition-all duration-150 ease-in-out 
        ${isEditMode ? 'cursor-pointer focus:ring-1 focus:ring-blue-500' : ''} 
        ${!data.styleConfig?.padding ? 'p-1' : ''} 
        ${!data.styleConfig?.fontSize ? 'text-sm' : ''}
        ${!data.styleConfig?.backgroundColor ? 'bg-transparent' : ''}
        ${isRecentChange ? 'animate-status-highlight' : ''}
      `}
      style={finalNodeStyle}
      tabIndex={isEditMode ? 0 : -1}
    >
      {showHandles && <Handle type="target" position={Position.Top} className="sld-handle-style" />}
      {data.label && <span className="font-medium whitespace-nowrap opacity-90 mr-1">{data.label}:</span>}
      <span className="font-semibold font-mono whitespace-nowrap">{displayText}</span>
      {unitText && <span className="text-[0.9em] opacity-70 whitespace-nowrap ml-0.5">{unitText}</span>}
      {showHandles && <Handle type="source" position={Position.Bottom} className="sld-handle-style" />}
    </div>
  );


  return (
    <> 
      {/* Popover logic is currently disabled with 'isEditMode && false' */}
      {isEditMode && false ? ( 
          <TextLabelConfigPopover
            node={nodeForPopover as unknown as ReactFlowNode<TextLabelNodeDataType>} 
            onUpdateNodeStyle={handleStyleConfigUpdate}
            onUpdateNodeLabel={handleLabelUpdate} 
            onUpdateNodeText={handleTextUpdate}   
            isEditMode={isEditMode} 
          >
            {NodeContentWithAnimation}
          </TextLabelConfigPopover>
        ) : (
          <div className="relative">
            {NodeContentWithAnimation} {/* Render DataLabelNode content directly */}
            {/* Info button for DataLabel */}
            {!isEditMode && (
              <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
                  style={{top: '2px', right: '2px'}}
                  onClick={(e) => {
                      const nodeObjectForDetailView = {
                          id, type, data, selected: !!selected, dragging: !!dragging, zIndex: zIndex || 0,
                          position: position, 
                          connectable: isConnectable,
                      } as unknown as CustomNodeType;
                      setSelectedElementForDetails(nodeObjectForDetailView);
                      e.stopPropagation();
                  }}
                  title="View Details"
              >
                  <InfoIcon className="h-3 w-3 text-primary/80" />
              </Button>
              )}
            </div>
        )}
    </>
  );
};
export default memo(DataLabelNode);