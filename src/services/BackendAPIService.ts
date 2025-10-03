/**
 * Backend API Service
 * Communicates with backend server for secure AI API access
 */

import logger from '../utils/logger';
import type {
  ChatRequest,
  ChatResponse,
  VisionRequest,
  VisionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  HealthCheckResponse,
  HTTPMethod,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class BackendAPIService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make a request to the backend API
   */
  private async request<T>(
    endpoint: string,
    method: HTTPMethod = 'POST',
    body: unknown = null
  ): Promise<T> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Backend API request failed:', error);
      throw error;
    }
  }

  /**
   * OpenAI Chat Completion via backend
   */
  async openaiChat(
    prompt: string,
    systemPrompt?: string,
    context: ChatRequest['context'] = null
  ): Promise<ChatResponse> {
    return this.request<ChatResponse>('/openai/chat', 'POST', {
      prompt,
      systemPrompt,
      model: 'gpt-4o-mini',
      context,
    } satisfies ChatRequest);
  }

  /**
   * OpenAI Vision via backend
   */
  async openaiVision(prompt: string, imageUrl: string): Promise<VisionResponse> {
    return this.request<VisionResponse>('/openai/vision', 'POST', {
      prompt,
      imageUrl,
      model: 'gpt-4o-mini',
    } satisfies VisionRequest);
  }

  /**
   * Google AI Image Generation via backend
   */
  async googleaiGenerateImage(prompt: string): Promise<ImageGenerationResponse> {
    return this.request<ImageGenerationResponse>('/googleai/generate-image', 'POST', {
      prompt,
      model: 'gemini-2.5-flash-image-preview',
    } satisfies ImageGenerationRequest);
  }

  /**
   * Google AI Chat via backend
   */
  async googleaiChat(prompt: string, systemPrompt?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>('/googleai/chat', 'POST', {
      prompt,
      systemPrompt,
      model: 'gemini-2.0-flash-exp',
    } satisfies Partial<ChatRequest>);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Health check failed:', error);
      return { status: 'error', error: errorMessage };
    }
  }
}

const backendAPIService = new BackendAPIService();

export default backendAPIService;
