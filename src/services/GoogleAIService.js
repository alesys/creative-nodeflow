// API service for Google Gemini (Nano Banana) integration
import { GoogleGenerativeAI } from '@google/generative-ai';

class GoogleAIService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    
    // Enhanced debugging
    console.log('Google AI Service Initialization:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- API Key present:', !!apiKey);
    console.log('- API Key length:', apiKey ? apiKey.length : 0);
    console.log('- API Key prefix:', apiKey ? apiKey.substring(0, 10) : 'none');
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn('Google API key not found in environment variables');
      console.warn('Make sure REACT_APP_GOOGLE_API_KEY is set in .env file');
      console.warn('Available REACT_APP variables:', 
        Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
      return;
    }
    
    try {
      this.client = new GoogleGenerativeAI(apiKey.trim());
      console.log('Google AI client initialized successfully');
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
      // Use Gemini 2.5 Flash Image (Nano Banana) for image generation
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

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
      
      // Note: The actual response format may vary - this is a placeholder
      // You may need to adjust based on the actual Gemini image generation API response
      const imageData = response.text(); // This might need adjustment
      
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