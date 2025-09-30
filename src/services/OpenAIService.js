// API service for OpenAI integration
import OpenAI from 'openai';

class OpenAIService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found in environment variables');
      return;
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
    });
  }

  async generateResponse(prompt, systemPrompt = null, context = null) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    const messages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add context if provided (from previous nodes)
    if (context && context.messages) {
      messages.push(...context.messages);
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      });

      const responseContent = response.choices[0].message.content;
      
      // Return response with updated context
      return {
        content: responseContent,
        context: {
          messages: [
            ...messages,
            {
              role: 'assistant', 
              content: responseContent
            }
          ]
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