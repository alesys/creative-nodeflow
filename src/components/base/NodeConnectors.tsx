/**
 * NodeConnectors Component
 * Multi-connector system with type validation and visual feedback
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ConnectorDefinition, ConnectorConfig } from '../../types/nodeConfig';
import { CONNECTOR_METADATA } from '../../types/nodeConfig';

interface NodeConnectorsProps {
  connectors: ConnectorDefinition;
  isConnectable: boolean;
}

export const NodeConnectors: React.FC<NodeConnectorsProps> = ({ 
  connectors, 
  isConnectable 
}) => {
  const renderConnector = (
    connector: ConnectorConfig, 
    type: 'source' | 'target',
    index: number,
    total: number
  ) => {
    const metadata = CONNECTOR_METADATA[connector.type];
    
    // Calculate position based on index and total
    // Distribute evenly: top (0%), middle (50%), bottom (100%)
    let topPercent = 50; // Default to middle
    if (total === 1) {
      topPercent = 50;
    } else if (total === 2) {
      topPercent = index === 0 ? 33 : 67;
    } else if (total === 3) {
      topPercent = index === 0 ? 25 : index === 1 ? 50 : 75;
    } else if (total >= 4) {
      topPercent = ((index + 1) / (total + 1)) * 100;
    }
    
    return (
      <div 
        key={connector.id}
        className={`connector-wrapper connector-${type}`}
        style={{
          position: 'absolute',
          [type === 'target' ? 'left' : 'right']: '-12px',
          top: `${topPercent}%`,
          transform: 'translateY(-50%)',
        }}
      >
        <Handle
          type={type}
          position={type === 'target' ? Position.Left : Position.Right}
          id={connector.id}
          isConnectable={isConnectable}
          style={{
            background: metadata.color,
            width: '12px',
            height: '12px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          title={`${metadata.icon} ${connector.label} (${metadata.label})`}
        />
        <span 
          className="connector-label"
          style={{
            position: 'absolute',
            [type === 'target' ? 'left' : 'right']: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '10px',
            color: metadata.color,
            whiteSpace: 'nowrap',
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {metadata.icon} {connector.label}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Input connectors (left side) */}
      {connectors.inputs.map((connector, index) => 
        renderConnector(connector, 'target', index, connectors.inputs.length)
      )}
      
      {/* Output connectors (right side) */}
      {connectors.outputs.map((connector, index) => 
        renderConnector(connector, 'source', index, connectors.outputs.length)
      )}
    </>
  );
};
