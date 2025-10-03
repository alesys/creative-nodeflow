// API service for Google Gemini integration
// "Nano Banana" is the official nickname for Gemini's image generation capability
// Model: gemini-2.5-flash-image-preview (requires billing for image generation)
// Documentation: https://ai.google.dev/gemini-api/docs/image-generation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LIMITS, MODELS, API_ERRORS } from '../constants/app.js';
import logger from '../utils/logger';

class GoogleAIService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
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

  async generateImage(prompt, context = null) {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Please check your API key.');
    }

    try {
      // Use Gemini 2.5 Flash Image Preview (Nano Banana) for image generation
      // Note: Image generation may require billing to be enabled
      const model = this.client.getGenerativeModel({ 
        model: MODELS.GOOGLE_IMAGE
      });

      let fullPrompt = prompt;
      
      // Add context if provided (from previous nodes)
      if (context && context.messages) {
        const contextText = context.messages
          .filter(msg => msg.role === 'assistant')
          .map(msg => msg.content)
          .join('\n');
        
        if (contextText) {
          fullPrompt = `Context: ${contextText}\n\nImage prompt: ${prompt}`;
        }
      }

      logger.debug('Generating image with prompt:', fullPrompt.substring(0, 100) + '...');
      
      const result = await model.generateContent([fullPrompt]);
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
      let imageData = null;
      let textData = null;
      
      for (const part of candidate.content.parts) {
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
      
      return {
        content: imageData,
        type: 'image',
        context: {
          messages: [
            ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
            {
              role: 'user',
              content: `Image generation request: ${prompt}`
            },
            {
              role: 'assistant',
              content: `Generated image based on: ${prompt}`,
              imageData: imageData
            }
          ].slice(-LIMITS.MAX_CONTEXT_MESSAGES)
        }
      };
    } catch (error) {
      logger.error('Google AI API Error Details:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        cause: error.cause
      });
      
      // Provide specific error guidance based on common issues
      let errorMessage = `Failed to generate image: ${error.message}`;
      
      if (error.message?.includes('FAILED_PRECONDITION')) {
        errorMessage += '\n\n💡 Solution: Image generation requires billing to be enabled in Google AI Studio. Please visit https://aistudio.google.com/ and enable billing for your project.';
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage += '\n\n💡 Solution: Your API key may not have access to image generation features. Check your API key permissions.';
      } else if (error.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage += '\n\n💡 Solution: You have exceeded the rate limit. Please wait a moment before trying again.';
      } else if (error.message?.includes('NOT_FOUND')) {
        errorMessage += '\n\n💡 Solution: The image generation model may not be available in your region or with your current plan.';
      }
      
      throw new Error(errorMessage);
    }
  }

  async generateText(prompt, context = null) {
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
      
      return {
        content: responseContent,
        type: 'text',
        context: {
          messages: [
            ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
            {
              role: 'user',
              content: prompt
            },
            {
              role: 'assistant',
              content: responseContent
            }
          ].slice(-LIMITS.MAX_CONTEXT_MESSAGES)
        }
      };
    } catch (error) {
      logger.error('Google AI API Error:', error);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  isConfigured() {
    return !!this.client;
  }
}

const googleAIServiceInstance = new GoogleAIService();
export default googleAIServiceInstance;