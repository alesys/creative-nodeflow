/**
 * Flow and Template Type Definitions
 * Defines the structure for saving and loading flows with consideration for future multi-tenancy
 */

import type { Node, Edge, Viewport } from '@xyflow/react';

// ============================================================================
// Future Multi-Tenancy Support
// ============================================================================

/**
 * User identification for future authentication system
 */
export interface FlowUser {
  userId: string;
  username?: string;
  email?: string;
}

/**
 * Organization/workspace for future multi-tenancy
 */
export interface FlowOrganization {
  orgId: string;
  orgName?: string;
}

/**
 * Permission levels for future sharing/collaboration
 */
export type FlowPermission = 'private' | 'org-shared' | 'public';

// ============================================================================
// Flow Metadata
// ============================================================================

export interface FlowMetadata {
  id: string;
  name: string;
  description?: string;
  
  // Timestamps
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  
  // Future multi-tenancy fields
  owner?: FlowUser;
  organization?: FlowOrganization;
  permission?: FlowPermission;
  
  // Tags for organization and search
  tags?: string[];
  
  // Version tracking
  version: string; // Semantic versioning (e.g., "1.0.0")
  appVersion?: string; // Version of the app that created this flow
}

// ============================================================================
// Flow State
// ============================================================================

/**
 * Complete serializable state of a ReactFlow instance
 */
export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

// ============================================================================
// Saved Flow
// ============================================================================

/**
 * A saved flow with metadata and state
 */
export interface SavedFlow {
  metadata: FlowMetadata;
  state: FlowState;
  isTemplate: boolean;
}

// ============================================================================
// Template
// ============================================================================

/**
 * A template is a reusable flow pattern
 * Templates are flows that can be instantiated multiple times
 */
export interface FlowTemplate extends SavedFlow {
  isTemplate: true;
  
  // Template-specific metadata
  category?: string;
  thumbnail?: string; // Base64 or URL
  usageCount?: number; // Track how many times this template has been used
}

// ============================================================================
// Storage Interface
// ============================================================================

/**
 * Interface for flow storage operations
 * Allows for easy swapping between localStorage, backend API, etc.
 */
export interface FlowStorageService {
  // Flow operations
  saveFlow(flow: SavedFlow): Promise<void>;
  loadFlow(id: string): Promise<SavedFlow | null>;
  deleteFlow(id: string): Promise<void>;
  listFlows(options?: FlowListOptions): Promise<SavedFlow[]>;
  
  // Template operations
  saveTemplate(template: FlowTemplate): Promise<void>;
  loadTemplate(id: string): Promise<FlowTemplate | null>;
  deleteTemplate(id: string): Promise<void>;
  listTemplates(options?: TemplateListOptions): Promise<FlowTemplate[]>;
}

/**
 * Options for listing flows
 */
export interface FlowListOptions {
  userId?: string;
  orgId?: string;
  tags?: string[];
  searchQuery?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Options for listing templates
 */
export interface TemplateListOptions extends FlowListOptions {
  category?: string;
}

// ============================================================================
// Save Dialog Data
// ============================================================================

/**
 * Data for the save flow dialog
 */
export interface SaveFlowDialogData {
  name: string;
  description?: string;
  tags?: string[];
  saveAsTemplate: boolean;
  templateCategory?: string;
}
