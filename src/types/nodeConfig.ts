/**
 * Base Node Configuration Types
 * Defines the structure for creating nodes with BaseNode component
 */

import type { ReactNode } from 'react';

// ============================================================================
// Connector Types
// ============================================================================

export type ConnectorType = 'text' | 'image' | 'video' | 'any';

export interface ConnectorConfig {
  id: string;
  type: ConnectorType;
  label: string;
  position: 'top' | 'middle' | 'bottom';
  required?: boolean;
  accept?: ConnectorType[]; // For validation - what types can connect
}

export interface ConnectorDefinition {
  inputs: ConnectorConfig[];
  outputs: ConnectorConfig[];
}

// ============================================================================
// Node Configuration
// ============================================================================

export type NodeVariant = 'positive' | 'loader' | 'output' | 'panel';

export interface NodeHeaderConfig {
  icon?: string;
  title: string;
  variant: NodeVariant;
  actions?: ReactNode;
}

export interface NodeStatusBarConfig {
  show: boolean;
  status?: 'idle' | 'processing' | 'error' | 'success';
  message?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
}

export interface NodeBodySection {
  id: string;
  label?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  content: ReactNode;
}

export interface NodeConfig {
  // Header configuration
  header: NodeHeaderConfig;
  
  // Status bar configuration
  statusBar?: NodeStatusBarConfig;
  
  // Connector configuration
  connectors?: ConnectorDefinition;
  
  // Body sections (helper, details, controls, etc.)
  sections?: NodeBodySection[];
  
  // Resize configuration
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  
  // Styling
  className?: string;
  
  // Error state
  error?: string | null;
}

// ============================================================================
// Connector Metadata (for visual display)
// ============================================================================

export interface ConnectorMetadata {
  color: string;
  icon: string;
  label: string;
}

export const CONNECTOR_METADATA: Record<ConnectorType, ConnectorMetadata> = {
  text: {
    color: '#3B82F6', // Blue
    icon: '📝',
    label: 'Text'
  },
  image: {
    color: '#A855F7', // Purple
    icon: '🖼️',
    label: 'Image'
  },
  video: {
    color: '#EF4444', // Red
    icon: '🎬',
    label: 'Video'
  },
  any: {
    color: '#6B7280', // Gray
    icon: '⚡',
    label: 'Any'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if two connector types are compatible
 */
export function areConnectorsCompatible(
  sourceType: ConnectorType,
  targetType: ConnectorType
): boolean {
  // 'any' can connect to anything
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }
  
  // Otherwise, types must match
  return sourceType === targetType;
}

/**
 * Validate a connection based on connector configs
 */
export function validateConnection(
  sourceConnector: ConnectorConfig,
  targetConnector: ConnectorConfig
): boolean {
  // Check if target accepts the source type
  if (targetConnector.accept && targetConnector.accept.length > 0) {
    return targetConnector.accept.includes(sourceConnector.type);
  }
  
  // Fall back to basic compatibility check
  return areConnectorsCompatible(sourceConnector.type, targetConnector.type);
}
