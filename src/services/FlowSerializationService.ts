/**
 * Flow Serialization Service
 * Handles serialization and deserialization of ReactFlow state
 */

import type { Node, Edge, Viewport } from '@xyflow/react';
import type { FlowState, SavedFlow, FlowTemplate, FlowMetadata } from '../types/flow';
import logger from '../utils/logger';

class FlowSerializationService {
  /**
   * Serialize ReactFlow state to a SavedFlow object
   */
  serializeFlow(
    nodes: Node[],
    edges: Edge[],
    viewport: Viewport,
    metadata: Partial<FlowMetadata>,
    isTemplate: boolean = false
  ): SavedFlow {
    const now = new Date().toISOString();
    
    // Generate ID if not provided
    const id = metadata.id || this.generateId();
    
    // Create complete metadata
    const fullMetadata: FlowMetadata = {
      id,
      name: metadata.name || 'Untitled Flow',
      description: metadata.description,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      version: metadata.version || '1.0.0',
      appVersion: process.env.REACT_APP_VERSION || '1.0.0',
      owner: metadata.owner,
      organization: metadata.organization,
      permission: metadata.permission || 'private',
      tags: metadata.tags || []
    };
    
    // Create flow state
    const state: FlowState = {
      nodes: this.sanitizeNodes(nodes),
      edges: this.sanitizeEdges(edges),
      viewport: { ...viewport }
    };
    
    return {
      metadata: fullMetadata,
      state,
      isTemplate
    };
  }
  
  /**
   * Serialize as a template
   */
  serializeTemplate(
    nodes: Node[],
    edges: Edge[],
    viewport: Viewport,
    metadata: Partial<FlowMetadata>,
    category?: string
  ): FlowTemplate {
    const flow = this.serializeFlow(nodes, edges, viewport, metadata, true);
    
    return {
      ...flow,
      isTemplate: true,
      metadata: {
        ...flow.metadata,
      },
      category,
      usageCount: 0
    } as FlowTemplate;
  }
  
  /**
   * Deserialize a SavedFlow back to ReactFlow state
   */
  deserializeFlow(savedFlow: SavedFlow): FlowState {
    return {
      nodes: this.restoreNodes(savedFlow.state.nodes),
      edges: this.restoreEdges(savedFlow.state.edges),
      viewport: savedFlow.state.viewport
    };
  }
  
  /**
   * Create a new flow instance from a template
   */
  instantiateTemplate(template: FlowTemplate, newName?: string): SavedFlow {
    const now = new Date().toISOString();
    const id = this.generateId();
    
    return {
      metadata: {
        ...template.metadata,
        id,
        name: newName || `${template.metadata.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        version: '1.0.0'
      },
      state: {
        ...template.state,
        // Reset node IDs to avoid conflicts
        nodes: this.regenerateNodeIds(template.state.nodes)
      },
      isTemplate: false
    };
  }
  
  /**
   * Sanitize nodes for serialization (remove non-serializable data)
   */
  private sanitizeNodes(nodes: Node[]): Node[] {
    return nodes.map(node => ({
      ...node,
      // Remove any functions or non-serializable data from node.data
      data: this.sanitizeNodeData(node.data)
    }));
  }
  
  /**
   * Sanitize node data (remove callbacks and functions)
   */
  private sanitizeNodeData(data: any): any {
    if (!data) return data;
    
    const sanitized: any = {};
    
    for (const key in data) {
      const value = data[key];
      
      // Skip functions
      if (typeof value === 'function') {
        continue;
      }
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeNodeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize edges for serialization
   */
  private sanitizeEdges(edges: Edge[]): Edge[] {
    return edges.map(edge => ({
      ...edge,
      // Remove any non-serializable data
      data: edge.data ? { ...edge.data } : undefined
    }));
  }
  
  /**
   * Restore nodes after deserialization
   * Note: Callbacks (onOutput, onReceiveInput) will need to be re-attached by the app
   */
  private restoreNodes(nodes: Node[]): Node[] {
    return nodes.map(node => ({
      ...node,
      // The app will need to re-attach callbacks after loading
    }));
  }
  
  /**
   * Restore edges after deserialization
   */
  private restoreEdges(edges: Edge[]): Edge[] {
    return edges.map(edge => ({
      ...edge
    }));
  }
  
  /**
   * Regenerate node IDs to avoid conflicts when instantiating templates
   */
  private regenerateNodeIds(nodes: Node[]): Node[] {
    const idMap = new Map<string, string>();
    
    // Generate new IDs for all nodes
    nodes.forEach(node => {
      idMap.set(node.id, this.generateNodeId());
    });
    
    // Update nodes with new IDs
    return nodes.map(node => ({
      ...node,
      id: idMap.get(node.id) || node.id
    }));
  }
  
  /**
   * Generate a unique ID for flows/templates
   */
  private generateId(): string {
    return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate a unique node ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Validate a saved flow structure
   */
  validateFlow(flow: SavedFlow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!flow.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!flow.metadata.id) errors.push('Missing flow ID');
      if (!flow.metadata.name) errors.push('Missing flow name');
      if (!flow.metadata.createdAt) errors.push('Missing creation date');
      if (!flow.metadata.updatedAt) errors.push('Missing update date');
    }
    
    if (!flow.state) {
      errors.push('Missing flow state');
    } else {
      if (!Array.isArray(flow.state.nodes)) errors.push('Invalid nodes array');
      if (!Array.isArray(flow.state.edges)) errors.push('Invalid edges array');
      if (!flow.state.viewport) errors.push('Missing viewport');
    }
    
    if (typeof flow.isTemplate !== 'boolean') {
      errors.push('Missing isTemplate flag');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Export flow to JSON string
   */
  exportToJSON(flow: SavedFlow): string {
    try {
      return JSON.stringify(flow, null, 2);
    } catch (error) {
      logger.error('Failed to export flow to JSON:', error);
      throw new Error('Failed to export flow');
    }
  }
  
  /**
   * Import flow from JSON string
   */
  importFromJSON(json: string): SavedFlow {
    try {
      const flow = JSON.parse(json) as SavedFlow;
      const validation = this.validateFlow(flow);
      
      if (!validation.valid) {
        throw new Error(`Invalid flow format: ${validation.errors.join(', ')}`);
      }
      
      return flow;
    } catch (error) {
      logger.error('Failed to import flow from JSON:', error);
      throw new Error('Failed to import flow');
    }
  }
}

const flowSerializationService = new FlowSerializationService();
export default flowSerializationService;
