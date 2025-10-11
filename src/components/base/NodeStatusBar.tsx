/**
 * NodeStatusBar Component
 * Unified status bar component for all node types
 */

import React from 'react';
import type { NodeStatusBarConfig } from '../../types/nodeConfig';

interface NodeStatusBarProps {
  config: NodeStatusBarConfig;
}

export const NodeStatusBar: React.FC<NodeStatusBarProps> = ({ config }) => {
  const { status = 'idle', message, progress, showProgress = false } = config;
  
  return (
    <div className="node-status-bar" data-status={status}>
      <div className="status-primary">
        <span className="status-icon">
          {status === 'processing' && '⚙️'}
          {status === 'error' && '⚠️'}
          {status === 'success' && '✓'}
          {status === 'idle' && 'ℹ️'}
        </span>
        <span className="status-text">{message || 'Ready'}</span>
      </div>
      
      {showProgress && status === 'processing' && (
        <div className="status-secondary">
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: progress ? `${progress}%` : '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
