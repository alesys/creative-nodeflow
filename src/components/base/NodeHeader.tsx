/**
 * NodeHeader Component
 * Unified header component for all node types
 */

import React from 'react';
import type { NodeHeaderConfig } from '../../types/nodeConfig';

interface NodeHeaderProps {
  config: NodeHeaderConfig;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({ config }) => {
  const { icon, title, variant, actions } = config;
  
  return (
    <div className="node-header" data-variant={variant}>
      {icon && <span className="node-icon">{icon}</span>}
      <span className="node-title">{title}</span>
      {actions && (
        <div className="node-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
};
