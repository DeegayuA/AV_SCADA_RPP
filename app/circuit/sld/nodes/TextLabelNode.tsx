// components/sld/nodes/TextLabelNode.tsx
import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { TextLabelNodeData } from '@/types/sld';

const TextLabelNode: React.FC<NodeProps<TextLabelNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`sld-node text-label-node p-1 text-xs bg-transparent border-none ${selected ? 'ring-1 ring-blue-300' : ''}`}
    >
      {/* No handles needed for a static label */}
      <div className="whitespace-pre-wrap">{data.text || data.label || 'Text Label'}</div>
    </div>
  );
};

export default memo(TextLabelNode);