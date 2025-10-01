// API service for OpenAI integration
import OpenAI from 'openai';
import { LIMITS, MODELS, API_ERRORS } from '../constants/app.js';

class OpenAIService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenAI Service: Initializing...');
    }
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn(API_ERRORS.OPENAI_NOT_CONFIGURED);
      return;
    }
    
    try {
      this.client = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenAI client initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  async generateResponse(prompt, systemPrompt = null, context = null) {
    if (!this.client) {
      throw new Error(API_ERRORS.CLIENT_NOT_INITIALIZED);
    }

    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add context if provided (with windowing to prevent memory leak)
    if (context && context.messages) {
      const recentMessages = context.messages.slice(-LIMITS.MAX_CONTEXT_MESSAGES);
      messages.push(...recentMessages);
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await this.client.chat.completions.create({
        model: MODELS.OPENAI,
        messages: messages,
        max_tokens: LIMITS.MAX_TOKENS,
        temperature: 0.7
      });

      const responseContent = response.choices[0].message.content;
      
      // Return response with updated context (windowed to prevent memory leak)
      const updatedMessages = [
        ...messages,
        {
          role: 'assistant', 
          content: responseContent
        }
      ];
      
      return {
        content: responseContent,
        context: {
          messages: updatedMessages.slice(-LIMITS.MAX_CONTEXT_MESSAGES)
        }
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  isConfigured() {
    return !!this.client;
  }
}

const openAIServiceInstance = new OpenAIService();
export default openAIServiceInstance;