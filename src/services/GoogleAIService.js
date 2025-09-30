// API service for Google Gemini (Nano Banana) integration
import { GoogleGenerativeAI } from '@google/generative-ai';

class GoogleAIService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Google AI Service: Initializing...');
    }
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn('Google API key not configured. Check .env file.');
      return;
    }
    
    try {
      this.client = new GoogleGenerativeAI(apiKey.trim());
      if (process.env.NODE_ENV === 'development') {
        console.log('Google AI client initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Google AI client:', error);
      this.client = null;
    }
  }

  async generateImage(prompt, context = null) {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Please check your API key.');
    }

    try {
      // Use Gemini 2.5 Flash Image Preview (Nano Banana) for image generation
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

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

      const result = await model.generateContent([fullPrompt]);
      const response = await result.response;
      
      // Handle Gemini image generation response format
      let imageData = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inline_data) {
          // Convert base64 data to data URL for display
          imageData = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          break;
        }
      }
      
      return {
        content: imageData,
        type: 'image',
        context: {
          messages: [
            ...(context?.messages || []),
            {
              role: 'user',
              content: `Image generation request: ${prompt}`
            },
            {
              role: 'assistant',
              content: `Generated image based on: ${prompt}`,
              imageData: imageData
            }
          ]
        }
      };
    } catch (error) {
      console.error('Google AI API Error:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async generateText(prompt, context = null) {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Please check your API key.');
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
            ...(context?.messages || []),
            {
              role: 'user',
              content: prompt
            },
            {
              role: 'assistant',
              content: responseContent
            }
          ]
        }
      };
    } catch (error) {
      console.error('Google AI API Error:', error);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  isConfigured() {
    return !!this.client;
  }
}

const googleAIServiceInstance = new GoogleAIService();
export default googleAIServiceInstance;