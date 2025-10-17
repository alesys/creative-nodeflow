// AI Service for OpenAI integration
import OpenAI from 'openai';
import { LIMITS, MODELS, API_ERRORS } from '../constants/app';
import logger from '../utils/logger';
import type { ChatMessage, ConversationContext } from '../types/api';

interface OpenAIResponse {
  content: string;
  context: ConversationContext;
  type?: 'text' | 'image';
}

interface VisionOptions {
  detail?: 'auto' | 'low' | 'high';
  maxTokens?: number;
  temperature?: number;
}

class OpenAIService {
  private client: OpenAI | null;

  constructor() {
    this.client = null;
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        logger.warn('OpenAI API key not found');
        return;
      }

      this.client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
    }
  }

  /**
   * Generate response with conversation context
   */
  async generateResponse(
    prompt: string,
    systemPrompt: string | null = null,
    context: ConversationContext | null = null
  ): Promise<OpenAIResponse> {
    if (!this.client) {
      throw new Error(API_ERRORS.CLIENT_NOT_INITIALIZED);
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Helper to convert ArrayBuffer to base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    // Helper to inline blob URLs into data URLs; pass through http(s) and existing data URLs
    const inlineImageUrl = async (url: string): Promise<{ url: string; detail?: 'auto' | 'low' | 'high' }> => {
      try {
        if (!url) return { url };
        let actualUrl = url;
        if (actualUrl.startsWith('__BLOB_URL__:')) {
          actualUrl = actualUrl.replace('__BLOB_URL__:', '');
        }
        if (actualUrl.startsWith('data:')) {
          return { url: actualUrl, detail: 'auto' };
        }
        if (actualUrl.startsWith('blob:')) {
          const resp = await fetch(actualUrl);
          const contentType = resp.headers.get('content-type') || 'image/png';
          const buf = await resp.arrayBuffer();
          const b64 = arrayBufferToBase64(buf);
          return { url: `data:${contentType};base64,${b64}`, detail: 'auto' };
        }
        // For http(s), let OpenAI fetch directly
        return { url: actualUrl, detail: 'auto' };
      } catch (e) {
        // On failure, fall back to passing original URL
        return { url, detail: 'auto' };
      }
    };

    // Add context if provided (with windowing to prevent memory leak)
    if (context && context.messages) {
      const recentMessages = context.messages.slice(-LIMITS.MAX_CONTEXT_MESSAGES);

      for (const msg of recentMessages) {
        if (typeof msg.content === 'string') {
          // Simple text message
          messages.push({
            role: msg.role,
            content: msg.content
          } as OpenAI.Chat.ChatCompletionMessageParam);
        } else if (Array.isArray(msg.content)) {
          // Multimodal message with text and images
          const contentParts: Array<OpenAI.Chat.ChatCompletionContentPart> = [];

          for (const part of msg.content) {
            if (part.type === 'text') {
              contentParts.push({
                type: 'text',
                text: part.text
              });
            } else if (part.type === 'image') {
              const inlined = await inlineImageUrl(part.imageUrl);
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: inlined.url,
                  detail: inlined.detail || 'auto'
                }
              });
            }
          }

          messages.push({
            role: msg.role,
            content: contentParts
          } as OpenAI.Chat.ChatCompletionMessageParam);
        }
      }
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      // GPT-5-nano has strict parameter limitations
      const apiParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: MODELS.OPENAI,
        messages: messages
      };

      // Only add optional parameters for non-GPT-5-nano models
      if (MODELS.OPENAI !== 'gpt-5-nano') {
        apiParams.max_completion_tokens = LIMITS.MAX_TOKENS;
        apiParams.temperature = 0.7;
      }

      const response = await this.client.chat.completions.create(apiParams);

      const responseContent = response.choices[0].message.content || '';

      // Return response with updated context (windowed to prevent memory leak)
      // Rebuild messages from context (excluding system message) + new assistant response
      const contextMessages: ChatMessage[] = context?.messages || [];
      const updatedMessages: ChatMessage[] = [
        ...contextMessages.slice(-LIMITS.MAX_CONTEXT_MESSAGES),
        {
          role: 'user' as const,
          content: prompt
        },
        {
          role: 'assistant' as const,
          content: responseContent
        }
      ].slice(-LIMITS.MAX_CONTEXT_MESSAGES);

      return {
        content: responseContent,
        context: {
          messages: updatedMessages
        }
      };

    } catch (error) {
      logger.error('OpenAI API Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('billing')) {
        throw new Error(API_ERRORS.BILLING_REQUIRED);
      }
      if (errorMessage.includes('rate limit')) {
        throw new Error(API_ERRORS.RATE_LIMIT);
      }

      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  /**
   * Analyze image using OpenAI Vision API
   */
  async analyzeImage(
    imageFile: File,
    prompt: string = "Describe this image in detail.",
    options: VisionOptions = {}
  ): Promise<string> {
    if (!this.client) {
      throw new Error(API_ERRORS.CLIENT_NOT_INITIALIZED);
    }

    try {
      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile);

      // GPT-5-nano has strict parameter limitations for vision too
      const apiParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: MODELS.OPENAI_VISION,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: options.detail || 'auto'
                }
              }
            ]
          }
        ]
      };

      // Only add optional parameters for non-GPT-5-nano models
      if (MODELS.OPENAI_VISION !== 'gpt-5-nano') {
        apiParams.max_completion_tokens = options.maxTokens || LIMITS.MAX_TOKENS;
        apiParams.temperature = options.temperature || 0.7;
      }

      const response = await this.client.chat.completions.create(apiParams);

      return (response.choices[0].message.content || '').trim();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OpenAI Vision API Error:', error);
      throw new Error(`Failed to analyze image: ${errorMessage}`);
    }
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}

// Create singleton instance
const openAIService = new OpenAIService();
export default openAIService;
