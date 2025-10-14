/**
 * Shared API Type Definitions
 * Common types used across AI services and backend communication
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ImageContent {
  type: 'image';
  imageUrl: string;
  mimeType?: string;
}

export interface VideoContent {
  type: 'video';
  videoUrl: string;
  mimeType?: string;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export type MessageContent = string | Array<TextContent | ImageContent | VideoContent>;

export interface ChatMessage {
  role: MessageRole;
  content: MessageContent;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ConversationContext {
  messages: ChatMessage[];
}

export interface FileContext {
  fileId: string;
  fileName?: string;
  content?: string | { fullText?: string } | import('./api').ImageContent | import('./api').VideoContent;
  contextPrompt?: string;
  summary?: string;
  type?: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface ChatRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  context?: ConversationContext | null;
}

export interface VisionRequest {
  prompt: string;
  imageUrl: string;
  model?: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  content: string;
  context: ConversationContext;
  type: 'text' | 'image';
  model: string;
  usage?: TokenUsage;
}

export interface VisionResponse {
  content: string;
  type: 'text';
  model: string;
  usage?: TokenUsage;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  textContent?: string;
  type: 'image';
  model: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp?: string;
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  error: string;
  type?: string;
  details?: unknown;
  status?: number;
}

// ============================================================================
// Output Data Types (for node communication)
// ============================================================================

export interface OutputData {
  nodeId: string;
  content: string;
  context?: ConversationContext;
  type: 'text' | 'image' | 'video';
  videoUrl?: string;
}

// ============================================================================
// HTTP Method Types
// ============================================================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
