/**
 * Node Data Type Definitions
 * Type definitions for ReactFlow node data across all node types
 */

import type { ConversationContext, FileContext, OutputData } from './api';

// ============================================================================
// Base Node Data Types
// ============================================================================

export interface BaseNodeData {
  onOutput?: (data: OutputData) => void;
  onReceiveInput?: (callback: (data: InputData) => void) => void;
}

export interface InputData {
  nodeId: string;
  content: string;
  context?: ConversationContext;
  type: 'text' | 'image';
}

// ============================================================================
// Prompt Node Data Types
// ============================================================================

export interface PromptNodeData extends BaseNodeData {
  prompt: string;
  systemPrompt?: string;
  fileContexts?: FileContext[];
}

export interface StartingPromptNodeData extends PromptNodeData {
  // Starting prompt specific properties (if any)
}

export interface AgentPromptNodeData extends PromptNodeData {
  // Agent prompt specific properties (if any)
}

export interface ImagePromptNodeData extends BaseNodeData {
  prompt: string;
  fileContexts?: FileContext[];
  aspectRatio?: string;
}

export interface VideoPromptNodeData extends BaseNodeData {
  prompt: string;
  fileContexts?: FileContext[];
}

// ============================================================================
// Output Node Data Types
// ============================================================================

export interface OutputNodeData extends BaseNodeData {
  content: string;
  context?: ConversationContext;
  type?: 'text' | 'image' | 'video';
  videoUrl?: string;
}

export interface ImagePanelNodeData extends BaseNodeData {
  imageUrl?: string;
  imageFile?: File;
}

// ============================================================================
// Union Types
// ============================================================================

export type NodeData =
  | StartingPromptNodeData
  | AgentPromptNodeData
  | ImagePromptNodeData
  | VideoPromptNodeData
  | OutputNodeData
  | ImagePanelNodeData;

// ============================================================================
// Service Interface (for type-safe service abstraction)
// ============================================================================

export interface AIService {
  isConfigured(): boolean;
  generateResponse?(
    prompt: string,
    systemPrompt?: string | null,
    context?: ConversationContext | null
  ): Promise<{ content: string; context: ConversationContext }>;
  generateImage?(
    prompt: string,
    context?: ConversationContext | null
  ): Promise<{ content: string; type: 'image'; context: ConversationContext }>;
}
