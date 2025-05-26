// components/sld/nodes/DataLabelNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { CustomNodeType, DataPointLink, DataPoint } from '@/types/sld'; // Added CustomNodeType
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore'; // Added useOpcUaNodeValue
import { 
    getDataPointValue, 
    applyValueMapping, 
    formatDisplayValue,
    getDerivedStyle // We can use this for dynamic styling of the label itself
} from './nodeUtils'; 
import { TextIcon, InfoIcon } from 'lucide-react'; // Generic icon for a data label. Added InfoIcon
import { Button } from "@/components/ui/button"; // Added Button

interface DataLabelNodeData {
  elementType: 'dataLabel'; // Explicitly define for type safety if used in CustomNodeData union
  dataPointLinks?: DataPointLink[];
  label?: string;
  styleConfig?: {
    textAlign?: React.CSSProperties['textAlign'];
    fontSize?: React.CSSProperties['fontSize'];
    color?: React.CSSProperties['color'];
    fontWeight?: React.CSSProperties['fontWeight'];
    fontStyle?: React.CSSProperties['fontStyle'];
    backgroundColor?: React.CSSProperties['backgroundColor'];
    padding?: React.CSSProperties['padding'];
    fontFamily?: React.CSSProperties['fontFamily'];
  };
}

const DataLabelNode: React.FC<NodeProps<DataLabelNodeData>> = (props) => {
  const { data, selected, isConnectable, id, type, position, zIndex, dragging, width, height } = props; // Destructure all needed props
  const { isEditMode, currentUser, dataPoints, setSelectedElementForDetails } = useAppStore(state => ({
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
    dataPoints: state.dataPoints, // Assuming appStore provides all DataPoint metadata
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  // --- Main Display DataPointLink Handling ---
  const mainDisplayLink = useMemo(() => 
    data.dataPointLinks?.find(link => link.targetProperty === 'value' || link.targetProperty === 'text'),
    [data.dataPointLinks]
  );
  const mainDisplayDataPointConfig = useMemo(() => mainDisplayLink ? dataPoints[mainDisplayLink.dataPointId] : undefined, [mainDisplayLink, dataPoints]);
  const mainDisplayOpcUaNodeId = useMemo(() => mainDisplayDataPointConfig?.nodeId, [mainDisplayDataPointConfig]);
  const reactiveMainDisplayValue = useOpcUaNodeValue(mainDisplayOpcUaNodeId);

  const { displayText, unitText } = useMemo(() => {
    if (mainDisplayLink && mainDisplayDataPointConfig && reactiveMainDisplayValue !== undefined) {
      const mappedValue = applyValueMapping(reactiveMainDisplayValue, mainDisplayLink);
      const formattedText = formatDisplayValue(mappedValue, mainDisplayLink.format, mainDisplayDataPointConfig?.dataType);
      
      // Unit comes from format suffix, then dp unit
      const unit = mainDisplayLink.format?.suffix || mainDisplayDataPointConfig?.unit || '';
      return { displayText: formattedText, unitText: unit };
    }
    // Fallback if no DPLink for value/text, or if static text is preferred for some DataLabels
    return { displayText: data.label || '---', unitText: '' };
  }, [mainDisplayLink, mainDisplayDataPointConfig, reactiveMainDisplayValue, data.label]);

  // Derive dynamic styles (e.g., color based on value, visibility)
  // --- Derived Styles DataPointLink Handling ---
  const stylingLinks = useMemo(() => {
    return data.dataPointLinks?.filter(link => 
      !link.targetProperty || // Handle cases where targetProperty might be undefined but implies styling by context
      ['fillColor', 'backgroundColor', 'strokeColor', 'borderColor', 'textColor', 'color', 'visible', 'visibility', 'opacity'].includes(link.targetProperty) || 
      link.targetProperty.startsWith('--')
    )?.filter(link => link.dataPointId !== mainDisplayLink?.dataPointId) || []; // Exclude mainDisplayLink if already handled
  }, [data.dataPointLinks, mainDisplayLink]);

  // Subscriptions for up to 3 dedicated styling links (excluding mainDisplayLink if it's for styling)
  const styleLink1 = useMemo(() => stylingLinks[0], [stylingLinks]);
  const styleLink1DataPointConfig = useMemo(() => styleLink1 ? dataPoints[styleLink1.dataPointId] : undefined, [styleLink1, dataPoints]);
  const styleLink1OpcUaNodeId = useMemo(() => styleLink1DataPointConfig?.nodeId, [styleLink1DataPointConfig]);
  const reactiveStyleLink1Value = useOpcUaNodeValue(styleLink1OpcUaNodeId);

  const styleLink2 = useMemo(() => stylingLinks[1], [stylingLinks]);
  const styleLink2DataPointConfig = useMemo(() => styleLink2 ? dataPoints[styleLink2.dataPointId] : undefined, [styleLink2, dataPoints]);
  const styleLink2OpcUaNodeId = useMemo(() => styleLink2DataPointConfig?.nodeId, [styleLink2DataPointConfig]);
  const reactiveStyleLink2Value = useOpcUaNodeValue(styleLink2OpcUaNodeId);

  const styleLink3 = useMemo(() => stylingLinks[2], [stylingLinks]);
  const styleLink3DataPointConfig = useMemo(() => styleLink3 ? dataPoints[styleLink3.dataPointId] : undefined, [styleLink3, dataPoints]);
  const styleLink3OpcUaNodeId = useMemo(() => styleLink3DataPointConfig?.nodeId, [styleLink3DataPointConfig]);
  const reactiveStyleLink3Value = useOpcUaNodeValue(styleLink3OpcUaNodeId);
  
  const opcUaValuesForDerivedStyle = useMemo(() => {
    const values: Record<string, string | number | boolean> = {};

    // Add main display value if its nodeId is defined
    // This is crucial if mainDisplayLink itself is used for a style property (e.g. text color based on value)
    if (mainDisplayOpcUaNodeId && reactiveMainDisplayValue !== undefined) {
      values[mainDisplayOpcUaNodeId] = reactiveMainDisplayValue;
    }

    // Add values for dedicated styling links
    if (styleLink1OpcUaNodeId && reactiveStyleLink1Value !== undefined) {
      values[styleLink1OpcUaNodeId] = reactiveStyleLink1Value;
    }
    if (styleLink2OpcUaNodeId && reactiveStyleLink2Value !== undefined) {
      values[styleLink2OpcUaNodeId] = reactiveStyleLink2Value;
    }
    if (styleLink3OpcUaNodeId && reactiveStyleLink3Value !== undefined) {
      values[styleLink3OpcUaNodeId] = reactiveStyleLink3Value;
    }
    return values;
  }, [
    mainDisplayOpcUaNodeId, reactiveMainDisplayValue,
    styleLink1OpcUaNodeId, reactiveStyleLink1Value,
    styleLink2OpcUaNodeId, reactiveStyleLink2Value,
    styleLink3OpcUaNodeId, reactiveStyleLink3Value
  ]);

  const derivedNodeStyles = useMemo(() => {
    return getDerivedStyle(data, opcUaValuesForDerivedStyle, dataPoints);
  }, [data, opcUaValuesForDerivedStyle, dataPoints]);

  // Combine static styles from data.styleConfig with derived dynamic styles
  const finalNodeStyle = useMemo(() => {
    const staticStyles: React.CSSProperties = {
        padding: '4px 8px', // Default padding
        fontSize: '11px',   // Default font size
        lineHeight: '1.3',
        color: 'var(--foreground)', // Default color
        backgroundColor: 'var(--card-muted)', // Slightly different bg for data labels
        textAlign: data.styleConfig?.textAlign || 'left', // Default left for "Label: Value"
        minWidth: '50px',
        display: 'flex', // To align label and value
        alignItems: 'baseline', // Align text baselines
        gap: '4px', // Gap between label and value part
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
    
    // Derived styles (like color from data) override static ones if they target the same CSS property
    return { ...staticStyles, ...derivedNodeStyles };
  }, [data.styleConfig, derivedNodeStyles]);


  const showHandles = isConnectable && isNodeEditable; // Show handles only if connectable & editable

  return (
    <motion.div
      className={`
        sld-node data-label-node group rounded-md shadow-sm
        border border-border dark:border-neutral-700 
        transition-all duration-150 ease-in-out
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-black' : 
          selected ? 'ring-1 ring-accent dark:ring-offset-black' : 
          isNodeEditable ? 'hover:shadow-md hover:border-primary/50' : ''}
        ${isNodeEditable ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={finalNodeStyle} // This applies the combined styles
      variants={{ hover: { scale: isNodeEditable ? 1.02 : 1 }, initial: { scale: 1 } }}
      whileHover="hover" initial="initial"
      transition={{ type: 'spring', stiffness: 350, damping: 15 }}
      title={data.label + (mainDisplayLink ? `: ${dataPoints[mainDisplayLink.dataPointId]?.description || mainDisplayLink.dataPointId}`: '')}
    >
      {!isEditMode && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-5 w-5 rounded-full z-20 bg-background/60 hover:bg-secondary/80 p-0"
          style={{top: '2px', right: '2px'}} // Adjust position for smaller node
          onClick={(e) => {
            e.stopPropagation();
            // Ensure data has elementType for CustomNodeType reconstruction if it's part of the type definition explicitly
            const nodeDataWithElementType: DataLabelNodeData = { ...data, elementType: 'dataLabel' };
            const fullNodeObject: CustomNodeType = {
                id, type, position, data: nodeDataWithElementType, selected, dragging, zIndex, width, height,
            };
            setSelectedElementForDetails(fullNodeObject);
          }}
          title="View Details"
        >
          <InfoIcon className="h-3 w-3 text-primary/80" />
        </Button>
      )}

      {/* DataLabels are not typically primary connection points for power flow, 
          but might be for data/control signals. Kept minimal and conditional. */}
      {showHandles && (
        <>
          <Handle type="target" position={Position.Left} id={`${id}-left-ctrl`} className="!w-2 !h-full !-ml-1 !rounded-none !bg-transparent !border-none group-hover:!bg-primary/20" />
          <Handle type="source" position={Position.Right} id={`${id}-right-ctrl`} className="!w-2 !h-full !-mr-1 !rounded-none !bg-transparent !border-none group-hover:!bg-primary/20" />
        </>
      )}
      
      {/* Label Part (Static) */}
      {data.label && <span className="font-medium whitespace-nowrap opacity-90">{data.label}</span>}
      
      {/* Value Part (Dynamic) */}
      <span 
        className="font-semibold font-mono whitespace-nowrap" 
        style={{ color: finalNodeStyle.color /* Explicitly inherit final color if needed or let CSS cascade */}}
      >
        {displayText}
      </span>
      {unitText && <span className="text-[0.9em] opacity-70 whitespace-nowrap ml-0.5">{unitText}</span>}

    </motion.div>
  );
};
export default memo(DataLabelNode);