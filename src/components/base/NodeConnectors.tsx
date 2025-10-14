/**
 * NodeConnectors Component
 * Multi-connector system with inline display between status bar and body
 * Shows connectors as labeled rows for better visibility
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ConnectorDefinition } from '../../types/nodeConfig';
import { CONNECTOR_METADATA } from '../../types/nodeConfig';

interface NodeConnectorsProps {
  connectors: ConnectorDefinition;
  isConnectable: boolean;
}

export const NodeConnectors: React.FC<NodeConnectorsProps> = ({ 
  connectors, 
  isConnectable 
}) => {
  // Find the maximum number of rows needed
  const maxRows = Math.max(connectors.inputs.length, connectors.outputs.length);
  
  // If no connectors, don't render anything
  if (maxRows === 0) {
    return null;
  }

  const renderConnectorRow = (index: number) => {
    const input = connectors.inputs[index];
    const output = connectors.outputs[index];
    
    return (
      <div key={`row-${index}`} className="connector-row">
        {/* Input (left) side */}
        <div className="connector-cell connector-input">
          {input && (
            <>
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                isConnectable={isConnectable}
                className="connector-handle"
                style={{
                  background: CONNECTOR_METADATA[input.type].color,
                }}
              />
              <span className="connector-label" style={{ color: CONNECTOR_METADATA[input.type].color }}>
                {CONNECTOR_METADATA[input.type].icon} {input.label}
              </span>
            </>
          )}
        </div>
        
        {/* Output (right) side */}
        <div className="connector-cell connector-output">
          {output && (
            <>
              <span className="connector-label" style={{ color: CONNECTOR_METADATA[output.type].color }}>
                {output.label} {CONNECTOR_METADATA[output.type].icon}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                isConnectable={isConnectable}
                className="connector-handle"
                style={{
                  background: CONNECTOR_METADATA[output.type].color,
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="node-connectors">
      {Array.from({ length: maxRows }, (_, index) => renderConnectorRow(index))}
    </div>
  );
};
