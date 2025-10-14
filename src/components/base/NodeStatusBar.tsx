/**
 * NodeStatusBar Component
 * Unified status bar component for all node types
 */

import React from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import type { NodeStatusBarConfig } from '../../types/nodeConfig';

interface NodeStatusBarProps {
  config: NodeStatusBarConfig;
}

export const NodeStatusBar: React.FC<NodeStatusBarProps> = ({ config }) => {
  const { status = 'idle', message } = config;
  
  const getStatusIcon = () => {
    const iconStyle = { fontSize: '14px' };
    switch (status) {
      case 'processing':
        return <SettingsIcon sx={iconStyle} className="status-icon-spinning" />;
      case 'error':
        return <WarningIcon sx={iconStyle} />;
      case 'success':
        return <CheckCircleIcon sx={iconStyle} />;
      case 'idle':
      default:
        return <InfoIcon sx={iconStyle} />;
    }
  };
  
  return (
    <div className="node-status-bar" data-status={status}>
      <div className="status-primary">
        <span className="status-icon">
          {getStatusIcon()}
        </span>
        <span className="status-text">{message || 'Ready'}</span>
      </div>
    </div>
  );
};
