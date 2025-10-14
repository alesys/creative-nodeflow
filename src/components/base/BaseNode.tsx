/**
 * BaseNode Component
 * Unified wrapper component for all node types
 * Provides consistent structure, styling, and behavior
 */

import React from 'react';
import { NodeResizer } from '@xyflow/react';
import { NodeHeader } from './NodeHeader';
import { NodeStatusBar } from './NodeStatusBar';
import { NodeConnectors } from './NodeConnectors';
import { NodeBody } from './NodeBody';
import type { NodeConfig } from '../../types/nodeConfig';
import { UI_DIMENSIONS } from '../../constants/app';

interface BaseNodeProps {
  id: string;
  isConnectable: boolean;
  config: NodeConfig;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ 
  isConnectable, 
  config,
  children 
}) => {
  const {
    header,
    statusBar,
    connectors,
    sections,
    resizable = true,
    minWidth = UI_DIMENSIONS.NODE_MIN_WIDTH,
    minHeight = UI_DIMENSIONS.NODE_MIN_HEIGHT,
    className = '',
    error
  } = config;
  
  // Determine node state classes
  const isProcessing = statusBar?.status === 'processing';
  const hasError = statusBar?.status === 'error' || !!error;
  
  const nodeClasses = [
    'node-panel',
    isProcessing && 'processing',
    hasError && 'error',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={nodeClasses}>
      {/* ReactFlow Native Resize Control */}
      {resizable && (
        <NodeResizer
          minWidth={minWidth}
          minHeight={minHeight}
        />
      )}
      
      {/* Header */}
      <NodeHeader config={header} />
      
      {/* Status Bar */}
      {statusBar?.show && (
        <NodeStatusBar config={statusBar} />
      )}
      
      {/* Connectors (inline between status bar and body) */}
      {connectors && (
        <NodeConnectors 
          connectors={connectors} 
          isConnectable={isConnectable}
        />
      )}
      
      {/* Body */}
      <NodeBody sections={sections}>
        {children}
      </NodeBody>
    </div>
  );
};
