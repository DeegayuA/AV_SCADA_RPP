// app/circuit/sld/nodes/GaugeNode.tsx
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore, useOpcUaNodeValue } from '@/stores/appStore';
import {
    getDataPointValue,
    applyValueMapping,
    formatDisplayValue,
    getStandardNodeState,
    getNodeAppearanceFromState,
    NodeAppearance
} from './nodeUtils';
// GaugeIcon from lucide-react might not be used if appearance.icon is not rendered.

// Define the data structure for GaugeNode
export interface GaugeNodeData extends BaseNodeData {
  config?: BaseNodeData['config'] & {
    minVal?: number;
    maxVal?: number;
    valueDataPointLink?: DataPointLink; // This is the new dedicated link
    unit?: string;
  };
}

const GaugeNode: React.FC<NodeProps<GaugeNodeData>> = (props) => {
  const { data, selected, isConnectable, id } = props;

  const { opcUaNodeValues, dataPoints, isEditMode, currentUser } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues, // Still needed for fallback and metadata
    dataPoints: state.dataPoints,
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    // setSelectedElementForDetails is not used here, can be removed if not needed elsewhere
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const minVal = data.config?.minVal ?? 0;
  const maxVal = data.config?.maxVal ?? 100;
  const unit = data.config?.unit ?? ''; // Unit from config (e.g. for display purposes)

  // Determine the primary DataPointLink: use valueDataPointLink if available
  const primaryValueLink = data.config?.valueDataPointLink;
  
  // Fallback to the first generic dataPointLink if primaryValueLink is not set
  const fallbackValueLink = useMemo(() => {
    if (!primaryValueLink && data.dataPointLinks && data.dataPointLinks.length > 0) {
      // Ensure the first generic link is intended for 'value' or is the only one
      // This simple fallback just takes the first one. More sophisticated logic could be added.
      return data.dataPointLinks[0];
    }
    return undefined;
  }, [primaryValueLink, data.dataPointLinks]);

  const valueLink = primaryValueLink || fallbackValueLink;

  // Use reactive value if primaryValueLink is set and has a dataPointId (nodeId)
  const reactiveNodeValue = useOpcUaNodeValue(primaryValueLink?.dataPointId);

  const { numericValue, formattedValue, displayUnit } = useMemo(() => {
    if (!valueLink || !valueLink.dataPointId || !dataPoints) {
      return { numericValue: null, formattedValue: "N/A", displayUnit: unit || '' };
    }

    const dpMeta = dataPoints[valueLink.dataPointId] as DataPoint | undefined;
    let rawValue: any;

    if (primaryValueLink && primaryValueLink.dataPointId === valueLink.dataPointId) {
      // Use reactive value if it's from the primary link
      rawValue = reactiveNodeValue;
    } else {
      // Fallback to global store for other cases (e.g., old dataPointLinks or if reactive value is not ready)
      rawValue = opcUaNodeValues[valueLink.dataPointId] ?? null;
    }
    
    // Apply mapping if any (applies to both reactive and fallback paths)
    const mappedValue = applyValueMapping(rawValue, valueLink);
    
    let currentNumericValue: number | null = null;
    if (typeof mappedValue === 'number') {
      currentNumericValue = mappedValue;
    } else if (typeof mappedValue === 'string') {
      const parsed = parseFloat(mappedValue);
      if (!isNaN(parsed)) {
        currentNumericValue = parsed;
      }
    } else if (typeof mappedValue === 'boolean') {
      // Simple boolean to number conversion for gauge display
      currentNumericValue = mappedValue ? 1 : 0; 
      // Potentially, map true/false to maxVal/minVal or other configured values
      // currentNumericValue = mappedValue ? maxVal : minVal;
    }

    // Formatting for display
    // The format object on valueLink should ideally be set up in SLDInspectorDialog
    const displayFormat = valueLink.format || { type: dpMeta?.dataType === 'Boolean' ? 'boolean' : (dpMeta?.dataType === 'String' ? 'string' : 'number') };
    const finalFormattedValue = formatDisplayValue(mappedValue, displayFormat, dpMeta?.dataType);
    
    // Determine unit: explicit config unit > DP unit > format suffix
    const finalUnit = unit || dpMeta?.unit || valueLink.format?.suffix || '';

    return { 
        numericValue: currentNumericValue, 
        formattedValue: finalFormattedValue, 
        displayUnit: finalUnit 
    };
  }, [valueLink, primaryValueLink, reactiveNodeValue, opcUaNodeValues, dataPoints, unit]); // Removed incorrect dpMeta references

  const clampedValue = useMemo(() => {
    if (numericValue === null) return minVal; 
    return Math.min(Math.max(numericValue, minVal), maxVal);
  }, [numericValue, minVal, maxVal]);

  const percentage = useMemo(() => {
    if (maxVal === minVal) return 0; // Avoid division by zero
    return ((clampedValue - minVal) / (maxVal - minVal)) * 100;
  }, [clampedValue, minVal, maxVal]);

  // SVG Gauge calculations (semi-circle)
  const svgWidth = 80;
  const svgHeight = 45; // Adjusted for semi-circle + text
  const arcRadius = 30;
  const arcStrokeWidth = 8;
  const arcCenterX = svgWidth / 2;
  const arcCenterY = svgHeight - arcStrokeWidth / 2 - 2; // Position Y to leave space for text

  const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0; // Adjust angle for semi-circle starting left
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };
  
  // Angles for semi-circle: 0 is left, 180 is right for this mapping
  const backgroundArcPath = describeArc(arcCenterX, arcCenterY, arcRadius, 0, 180);
  const valueArcAngle = (percentage / 100) * 180; // Map percentage to 0-180 degrees
  const valueArcPath = describeArc(arcCenterX, arcCenterY, arcRadius, 0, valueArcAngle);

  const nodeWidth = 90;
  const nodeHeight = 75;

  // Get standardized appearance
  const standardNodeState = useMemo(() => getStandardNodeState(null, null, null, "DATA_DISPLAY"), []);
  const appearance = useMemo(() => getNodeAppearanceFromState(standardNodeState), [standardNodeState]);
  const sldAccentVar = 'var(--sld-color-accent)'; // For selection ring

  const [isRecentChange, setIsRecentChange] = useState(false);
  const prevFormattedValueRef = useRef(formattedValue);

  useEffect(() => {
    if (prevFormattedValueRef.current !== formattedValue) {
      setIsRecentChange(true);
      const timer = setTimeout(() => setIsRecentChange(false), 700); // Match animation duration
      prevFormattedValueRef.current = formattedValue;
      return () => clearTimeout(timer);
    }
  }, [formattedValue]);

  return (
    <motion.div
      className={`
        sld-node gauge-node group custom-node-hover w-[${nodeWidth}px] h-[${nodeHeight}px] rounded-lg shadow-md
        flex flex-col items-center justify-center
        border-2
        ${isNodeEditable ? 'cursor-grab' : 'cursor-default'}
        ${selected ? `ring-2 ring-offset-2 ring-offset-black/10 dark:ring-offset-white/10` : ''}
      `}
      style={{
        borderColor: appearance.borderColorVar,
        '--ring-color': selected ? sldAccentVar : 'transparent',
      } as any}
      title={data.label}
      initial={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="sld-handle-style" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="sld-handle-style !-ml-1.5" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="sld-handle-style !-mr-1.5" style={{ background: 'var(--sld-color-handle-bg)', borderColor: 'var(--sld-color-handle-border)' }}/>

      <div className={`
          node-content-wrapper flex flex-col items-center justify-center p-1 w-full h-full rounded-sm
          text-foreground
          ${isRecentChange ? 'animate-status-highlight' : ''}
        `}
        style={{ 
          background: 'var(--sld-color-node-bg)', // Use CSS variable for background
          color: appearance.textColorVar, // Default text color from appearance
          // The 'animate-status-highlight' might need its --current-glow-color set if it uses it
          // For now, assuming it uses a generic accent from globals.css or its own definition
        }}
      >
        <p className="text-[9px] font-semibold text-center truncate w-full px-1" title={data.label} style={{ color: appearance.textColorVar }}>
          {data.label}
        </p>

        <div className="relative flex flex-col items-center justify-center w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[${svgHeight-10}px] mt-0.5">
            <path d={backgroundArcPath} strokeDasharray="2 2" stroke="var(--sld-color-neutral-bg-dark)" strokeWidth={arcStrokeWidth-2} fill="none" />
            {numericValue !== null && (
              <path d={valueArcPath} style={{ stroke: appearance.mainStatusColorVar }} strokeWidth={arcStrokeWidth} fill="none" strokeLinecap="round"/>
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center" style={{ top: arcCenterY - arcRadius - 5}}>
              <span className="text-[12px] font-bold" style={{ color: appearance.mainStatusColorVar }} title={`${formattedValue} ${displayUnit}`}>
                  {formattedValue}
              </span>
              {displayUnit && <span className="text-[7px] -mt-0.5" style={{ color: appearance.statusTextColorVar }}>{displayUnit}</span>}
          </div>
        </div>
         <p className="text-[7px] text-center w-full mt-auto leading-tight" title={`Range: ${minVal} - ${maxVal}`} style={{ color: appearance.statusTextColorVar }}>
          {minVal} ... {maxVal}
        </p>
      </div>
    </motion.div>
  );
};

export default memo(GaugeNode);
