// API service for Google Gemini integration
// "Nano Banana" is the official nickname for Gemini's image generation capability
// Model: gemini-2.5-flash-image-preview (requires billing for image generation)
// Documentation: https://ai.google.dev/gemini-api/docs/image-generation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LIMITS, MODELS, API_ERRORS } from '../constants/app';
import logger from '../utils/logger';
import type { ChatMessage, ConversationContext } from '../types/api';

interface GoogleAIResponse {
  content: string;
  type: 'text' | 'image';
  context: ConversationContext;
}

interface InlineData {
  data: string;
  mimeType: string;
}

interface SnakeCaseInlineData {
  data: string;
  mime_type: string;
}

interface ContentPart {
  inlineData?: InlineData;
  inline_data?: SnakeCaseInlineData;
  text?: string;
}

class GoogleAIService {
  private client: GoogleGenerativeAI | null;

  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient(): void {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      logger.warn(API_ERRORS.GOOGLE_NOT_CONFIGURED);
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(apiKey.trim());
    } catch (error) {
      logger.error('Failed to initialize Google AI client:', error);
      this.client = null;
    }
  }

  async generateImage(
    prompt: string,
    context: ConversationContext | null = null,
    aspectRatio: string = '1:1'
  ): Promise<GoogleAIResponse> {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Please check your API key.');
    }

    try {
      // Use Gemini 2.5 Flash Image Preview (Nano Banana) for image generation
      // Note: Image generation may require billing to be enabled
      const model = this.client.getGenerativeModel({
        model: MODELS.GOOGLE_IMAGE
      });

      // Build multimodal content array with text and images
      const contentParts: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

      // Add context if provided (from previous nodes)
      if (context && context.messages) {
        const contextTexts: string[] = [];

        for (const msg of context.messages) {
          // Process all messages (user, assistant, system) for context
          if (typeof msg.content === 'string') {
            // Only add text from non-system messages
            if (msg.role !== 'system') {
              contextTexts.push(msg.content);
            }
          } else if (Array.isArray(msg.content)) {
            // Handle multimodal content
            for (const part of msg.content) {
              if (part.type === 'text') {
                contextTexts.push(part.text);
              } else if (part.type === 'image') {
                // Extract base64 data from data URL
                const base64Match = part.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (base64Match) {
                  const mimeType = base64Match[1];
                  const base64Data = base64Match[2];
                  contentParts.push({
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  });
                  logger.debug('Added image from context to generation request');
                }
              }
            }
          }
        }

        if (contextTexts.length > 0) {
          const contextText = contextTexts.join('\n');
          contentParts.push(`Context: ${contextText}\n\nImage prompt: ${prompt}`);
        } else {
          contentParts.push(prompt);
        }
      } else {
        contentParts.push(prompt);
      }

      logger.debug('Generating image with', contentParts.length, 'content parts');
      logger.debug('Using aspect ratio:', aspectRatio);

      // Helper function to get aspect ratio description
      const getAspectRatioDescription = (ratio: string): string => {
        switch (ratio) {
          case '16:9': return 'wide landscape format';
          case '9:16': return 'tall portrait format';
          case '1:1': return 'square format';
          case '4:3': return 'standard landscape format';
          case '3:4': return 'standard portrait format';
          case '4:5': return 'slightly tall format';
          case '5:4': return 'slightly wide format';
          case '3:2': return 'classic landscape format';
          case '2:3': return 'classic portrait format';
          default: return 'custom aspect ratio';
        }
      };

      // Convert aspect ratio to Google's expected format  
      // Support all ratios available in the UI
      let normalizedAspectRatio = aspectRatio;
      
      // Ensure we're using a valid aspect ratio format
      const supportedRatios = ['1:1', '9:16', '16:9', '3:4', '4:3', '4:5', '5:4', '3:2', '2:3'];
      if (!supportedRatios.includes(aspectRatio)) {
        logger.warn(`Unsupported aspect ratio: ${aspectRatio}, defaulting to 1:1`);
        normalizedAspectRatio = '1:1';
      }

      logger.debug('Using normalized aspect ratio:', normalizedAspectRatio);

      // Enhanced approach: Add aspect ratio instructions to the prompt
      // This is more reliable than API configs which may not be supported
      let enhancedPrompt = prompt;
      if (normalizedAspectRatio !== '1:1') {
        const ratioDesc = getAspectRatioDescription(normalizedAspectRatio);
        enhancedPrompt = `Create an image in ${normalizedAspectRatio} aspect ratio (${ratioDesc}). ${prompt}`;
        logger.debug('Enhanced prompt with aspect ratio instruction:', normalizedAspectRatio);
      }
      
      // Replace the prompt in contentParts with enhanced version
      const enhancedContentParts = contentParts.map(part => {
        if (typeof part === 'string') {
          // Replace original prompt with enhanced prompt
          if (part.includes(`Image prompt: ${prompt}`)) {
            return part.replace(`Image prompt: ${prompt}`, `Image prompt: ${enhancedPrompt}`);
          } else if (part === prompt) {
            return enhancedPrompt;
          }
        }
        return part;
      });

      logger.debug('Final content parts for generation:', enhancedContentParts.length);

      // Try with generation config first, fallback to plain call
      let result;
      try {
        // Attempt 1: Try with imageConfig (may work in newer API versions)
        result = await model.generateContent(
          enhancedContentParts,
          {
            generationConfig: {
              temperature: 0.7,
              candidateCount: 1,
              // @ts-ignore - imageConfig may be supported
              imageConfig: {
                aspectRatio: normalizedAspectRatio
              }
            }
          } as any
        );
        logger.debug('Generated image with imageConfig');
      } catch (configError) {
        logger.debug('imageConfig failed, trying without config:', configError);
        // Attempt 2: Fallback to simple generation (aspect ratio in prompt)
        result = await model.generateContent(enhancedContentParts);
        logger.debug('Generated image without config, aspect ratio in prompt');
      }
      const response = await result.response;

      logger.debug('Gemini image response received');
      logger.debug('Response candidates:', response.candidates?.length);
      logger.debug('Response status:', response.candidates?.[0]?.finishReason);

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates returned from Gemini. This may indicate a billing or access issue.');
      }

      const candidate = response.candidates[0];
      logger.debug('Candidate finish reason:', candidate.finishReason);
      logger.debug('Candidate safety ratings:', candidate.safetyRatings);

      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Image generation blocked due to safety filters. Please try a different prompt.');
      }

      if (candidate.finishReason === 'RECITATION') {
        throw new Error('Image generation blocked due to recitation concerns. Please try a more unique prompt.');
      }

      if (!candidate.content || !candidate.content.parts) {
        logger.debug('Full response structure:', JSON.stringify(response, null, 2));
        throw new Error('No content parts in response. This may indicate billing is required for image generation.');
      }

      logger.debug('Number of content parts:', candidate.content.parts.length);

      // Handle Gemini image generation response format
      let imageData: string | null = null;
      let textData: string | null = null;

      for (const part of candidate.content.parts as ContentPart[]) {
        logger.debug('Processing part - inlineData:', typeof part.inlineData, 'text:', typeof part.text);

        // Check for inlineData (camelCase - actual API response format)
        if (part.inlineData && part.inlineData.data) {
          // Convert base64 data to data URL for display
          imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          logger.debug('Generated image data URL (first 100 chars):', imageData.substring(0, 100));
          break;
        }

        // Also check for snake_case format (backup compatibility)
        if (part.inline_data && part.inline_data.data) {
          imageData = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          logger.debug('Generated image data URL from snake_case (first 100 chars):', imageData.substring(0, 100));
          break;
        }

        if (part.text) {
          textData = part.text;
          logger.debug('Text part found:', part.text.substring(0, 100));
        }
      }

      if (!imageData) {
        logger.warn('No inlineData found in response parts');
        logger.debug('Available parts:', candidate.content.parts.map(p => Object.keys(p)));
        logger.debug('Full candidate structure for debugging:', JSON.stringify(candidate, null, 2));

        let errorMessage = 'No image data received from Gemini.';

        if (textData) {
          errorMessage += ` Response text: ${textData}`;
        }

        errorMessage += ' This usually indicates: 1) Billing needs to be enabled for image generation, 2) The prompt triggered safety filters, or 3) Regional restrictions.';

        throw new Error(errorMessage);
      }

      const updatedMessages: ChatMessage[] = [
        ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
        {
          role: 'user' as const,
          content: `Image generation request: ${prompt}`
        },
        {
          role: 'assistant' as const,
          content: [
            {
              type: 'text' as const,
              text: `Generated image based on: ${prompt}`
            },
            {
              type: 'image' as const,
              imageUrl: imageData,
              mimeType: imageData.split(';')[0].split(':')[1]
            }
          ]
        }
      ].slice(-LIMITS.MAX_CONTEXT_MESSAGES);

      return {
        content: imageData,
        type: 'image',
        context: {
          messages: updatedMessages
        }
      };
    } catch (error) {
      const errorObj = error as { message?: string; status?: number; statusCode?: number; cause?: unknown };

      logger.error('Google AI API Error Details:', {
        message: errorObj.message,
        status: errorObj.status,
        statusCode: errorObj.statusCode,
        cause: errorObj.cause
      });

      // Provide specific error guidance based on common issues
      let errorMessage = `Failed to generate image: ${errorObj.message || 'Unknown error'}`;

      if (errorObj.message?.includes('FAILED_PRECONDITION')) {
        errorMessage += '\n\n💡 Solution: Image generation requires billing to be enabled in Google AI Studio. Please visit https://aistudio.google.com/ and enable billing for your project.';
      } else if (errorObj.message?.includes('PERMISSION_DENIED')) {
        errorMessage += '\n\n💡 Solution: Your API key may not have access to image generation features. Check your API key permissions.';
      } else if (errorObj.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage += '\n\n💡 Solution: You have exceeded the rate limit. Please wait a moment before trying again.';
      } else if (errorObj.message?.includes('NOT_FOUND')) {
        errorMessage += '\n\n💡 Solution: The image generation model may not be available in your region or with your current plan.';
      }

      throw new Error(errorMessage);
    }
  }

  async generateVideo(
    prompt: string,
    context: ConversationContext | null = null
  ): Promise<GoogleAIResponse> {
    // NOTE: VEO-3 video generation is currently not supported through the standard SDK
    // The API requires using ai.models.generateVideos() which is not available in the current
    // @google/generative-ai package. This would need the newer @google/genai package.
    //
    // For now, we return a placeholder message explaining this limitation.

    const errorMessage = `Video generation with VEO-3 is not yet implemented.

This requires the @google/genai package which has a different API structure than the current @google/generative-ai package.

VEO-3 requires:
- The @google/genai package
- Using ai.models.generateVideos() method
- Polling for video completion
- Different authentication setup

Current limitation: This feature is planned for future implementation once the SDK is integrated.

Your prompt was: "${prompt}"`;

    logger.warn('VEO3 video generation attempted but not implemented');

    const updatedMessages: ChatMessage[] = [
      ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
      {
        role: 'user' as const,
        content: `Video generation request: ${prompt}`
      },
      {
        role: 'assistant' as const,
        content: errorMessage
      }
    ].slice(-LIMITS.MAX_CONTEXT_MESSAGES);

    return {
      content: errorMessage,
      type: 'text',
      context: {
        messages: updatedMessages
      }
    };
  }

  async generateText(
    prompt: string,
    context: ConversationContext | null = null
  ): Promise<GoogleAIResponse> {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Please check your API key.');
    }

    try {
      const model = this.client.getGenerativeModel({ model: MODELS.GOOGLE_TEXT });

      let fullPrompt = prompt;

      // Add context if provided
      if (context && context.messages) {
        const contextText = context.messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        if (contextText) {
          fullPrompt = `Previous context:\n${contextText}\n\nCurrent prompt: ${prompt}`;
        }
      }

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const responseContent = response.text();

      const updatedMessages: ChatMessage[] = [
        ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
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
        type: 'text',
        context: {
          messages: updatedMessages
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Google AI API Error:', error);
      throw new Error(`Failed to generate text: ${errorMessage}`);
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}

const googleAIServiceInstance = new GoogleAIService();
export default googleAIServiceInstance;
