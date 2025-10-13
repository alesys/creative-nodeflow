/**
 * Custom Edge Component
 * Enhanced edge with center handle for easier selection
 */

import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export const CustomEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Center handle/dot - always visible for easier selection */}
      <circle
        cx={labelX}
        cy={labelY}
        r={4}
        fill={selected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'}
        stroke={selected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'}
        strokeWidth={selected ? 2 : 1}
        style={{
          cursor: 'pointer',
          filter: selected ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))' : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.4))',
        }}
      />
    </>
  );
};

export default CustomEdge;
