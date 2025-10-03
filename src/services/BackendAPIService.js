/**
 * Backend API Service
 * Communicates with backend server for secure AI API access
 */

import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class BackendAPIService {
  /**
   * Make a request to the backend API
   */
  async request(endpoint, method = 'POST', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

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
  async openaiChat(prompt, systemPrompt, context = null) {
    return this.request('/openai/chat', 'POST', {
      prompt,
      systemPrompt,
      model: 'gpt-4o-mini',
      context,
    });
  }

  /**
   * OpenAI Vision via backend
   */
  async openaiVision(prompt, imageUrl) {
    return this.request('/openai/vision', 'POST', {
      prompt,
      imageUrl,
      model: 'gpt-4o-mini',
    });
  }

  /**
   * Google AI Image Generation via backend
   */
  async googleaiGenerateImage(prompt) {
    return this.request('/googleai/generate-image', 'POST', {
      prompt,
      model: 'gemini-2.5-flash-image-preview',
    });
  }

  /**
   * Google AI Chat via backend
   */
  async googleaiChat(prompt, systemPrompt) {
    return this.request('/googleai/chat', 'POST', {
      prompt,
      systemPrompt,
      model: 'gemini-2.0-flash-exp',
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      logger.error('Health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

const backendAPIService = new BackendAPIService();

export default backendAPIService;
