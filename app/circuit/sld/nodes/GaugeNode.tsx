// app/circuit/sld/nodes/GaugeNode.tsx
import React, { memo, useMemo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { BaseNodeData, CustomNodeType, DataPointLink, DataPoint } from '@/types/sld';
import { useAppStore } from '@/stores/appStore';
import { getDataPointValue, applyValueMapping, formatDisplayValue } from './nodeUtils';
import { GaugeIcon } from 'lucide-react'; // Placeholder icon

// Define the data structure for GaugeNode
export interface GaugeNodeData extends BaseNodeData {
  config?: BaseNodeData['config'] & {
    minVal?: number;
    maxVal?: number;
    valueDataPointLink?: DataPointLink;
    unit?: string;
  };
}

const GaugeNode: React.FC<NodeProps<GaugeNodeData>> = (props) => {
  const { data, selected, isConnectable, id } = props;

  const { opcUaNodeValues, dataPoints, isEditMode, currentUser, setSelectedElementForDetails } = useAppStore(state => ({
    opcUaNodeValues: state.opcUaNodeValues,
    dataPoints: state.dataPoints,
    isEditMode: state.isEditMode,
    currentUser: state.currentUser,
    setSelectedElementForDetails: state.setSelectedElementForDetails,
  }));

  const isNodeEditable = useMemo(() =>
    isEditMode && (currentUser?.role === 'admin'),
    [isEditMode, currentUser]
  );

  const minVal = data.config?.minVal ?? 0;
  const maxVal = data.config?.maxVal ?? 100;
  const unit = data.config?.unit ?? '';

  // Determine the primary DataPointLink for the gauge's value
  const valueLink = useMemo(() => {
    if (data.config?.valueDataPointLink) {
      return data.config.valueDataPointLink;
    }
    // Fallback to the first dataPointLink if valueDataPointLink is not explicitly set
    if (data.dataPointLinks && data.dataPointLinks.length > 0) {
      return data.dataPointLinks[0];
    }
    return undefined;
  }, [data.config?.valueDataPointLink, data.dataPointLinks]);

  const { numericValue, formattedValue, displayUnit } = useMemo(() => {
    if (!valueLink || !valueLink.dataPointId || !opcUaNodeValues || !dataPoints) {
      return { numericValue: null, formattedValue: "N/A", displayUnit: unit };
    }

    const dpMeta = dataPoints[valueLink.dataPointId] as DataPoint | undefined;
    const rawValue = getDataPointValue(valueLink.dataPointId, opcUaNodeValues, dataPoints);
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
        currentNumericValue = mappedValue ? 1 : 0; // Or map to min/max based on boolean
    }


    const finalFormattedValue = formatDisplayValue(mappedValue, valueLink.format, dpMeta?.dataType);
    const finalUnit = unit || dpMeta?.unit || valueLink.format?.suffix || '';

    return { 
        numericValue: currentNumericValue, 
        formattedValue: finalFormattedValue, 
        displayUnit: finalUnit 
    };
  }, [valueLink, opcUaNodeValues, dataPoints, unit]);

  const clampedValue = useMemo(() => {
    if (numericValue === null) return minVal; // Default to min if value is not available
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
  const nodeHeight = 75; // Adjusted height

  return (
    <motion.div
      className={`
        sld-node gauge-node group w-[${nodeWidth}px] h-[${nodeHeight}px] rounded-lg shadow-md
        flex flex-col items-center justify-center p-1
        border-2 border-neutral-400 dark:border-neutral-600
        bg-card dark:bg-neutral-800 
        transition-all duration-150
        ${selected && isNodeEditable ? 'ring-2 ring-primary ring-offset-1' : selected ? 'ring-1 ring-accent' : ''}
        ${isNodeEditable ? 'cursor-grab hover:shadow-lg' : 'cursor-default'}
      `}
      title={data.label}
      whileHover={{ scale: isNodeEditable ? 1.03 : 1 }}
      initial={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
    >
      <Handle type="target" position={Position.Top} id="top_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="source" position={Position.Bottom} id="bottom_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style" />
      <Handle type="target" position={Position.Left} id="left_in" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-ml-1.5" />
      <Handle type="source" position={Position.Right} id="right_out" isConnectable={isConnectable} className="!w-3 !h-3 sld-handle-style !-mr-1.5" />

      <p className="text-[9px] font-semibold text-center truncate w-full px-1" title={data.label}>
        {data.label}
      </p>

      <div className="relative flex flex-col items-center justify-center w-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[${svgHeight-10}px] mt-0.5">
          <path d={backgroundArcPath} strokeDasharray="2 2" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={arcStrokeWidth-2} fill="none" />
          {numericValue !== null && (
            <path d={valueArcPath} className="stroke-primary" strokeWidth={arcStrokeWidth} fill="none" strokeLinecap="round"/>
          )}
        </svg>
        <div className="absolute flex flex-col items-center justify-center" style={{ top: arcCenterY - arcRadius - 5}}>
            <span className="text-[12px] font-bold text-primary" title={`${formattedValue} ${displayUnit}`}>
                {formattedValue}
            </span>
            {displayUnit && <span className="text-[7px] text-muted-foreground -mt-0.5">{displayUnit}</span>}
        </div>
      </div>
       <p className="text-[7px] text-muted-foreground text-center w-full mt-auto leading-tight" title={`Range: ${minVal} - ${maxVal}`}>
        {minVal} ... {maxVal}
      </p>
    </motion.div>
  );
};

export default memo(GaugeNode);
