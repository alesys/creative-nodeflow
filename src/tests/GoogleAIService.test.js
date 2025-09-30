// GoogleAIService unit tests
import { describe, test, expect, beforeEach } from '@jest/globals';
import { setupTestEnvironment, createMockGoogleAIResponse } from './testUtils';

// Mock Google Generative AI module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn()
  }))
}));

describe('GoogleAIService', () => {
  setupTestEnvironment();

  let GoogleAIService;
  let mockGoogleAI;
  let mockModel;

  beforeEach(async () => {
    mockModel = {
      generateContent: jest.fn()
    };

    mockGoogleAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    };

    // Import after mocking
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => mockGoogleAI);
    
    // Import service after setting up mocks
    GoogleAIService = (await import('../services/GoogleAIService')).default;
  });

  test('initializes client with API key from environment', () => {
    expect(GoogleAIService.isConfigured()).toBe(true);
  });

  test('handles missing API key gracefully', async () => {
    process.env.REACT_APP_GOOGLE_API_KEY = '';
    
    jest.resetModules();
    const { default: ServiceWithoutKey } = await import('../services/GoogleAIService');
    
    expect(ServiceWithoutKey.isConfigured()).toBe(false);
  });

  test('generates image successfully', async () => {
    const mockResult = {
      response: {
        text: () => 'generated-image-data'
      }
    };
    mockModel.generateContent.mockResolvedValue(mockResult);

    const result = await GoogleAIService.generateImage('test image prompt');

    expect(result).toEqual({
      content: 'generated-image-data',
      type: 'image',
      context: {
        messages: [
          { role: 'user', content: 'Image generation request: test image prompt' },
          { role: 'assistant', content: 'Generated image based on: test image prompt', imageData: 'generated-image-data' }
        ]
      }
    });

    expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash-image' });
    expect(mockModel.generateContent).toHaveBeenCalledWith(['test image prompt']);
  });

  test('generates image with context', async () => {
    const mockResult = {
      response: {
        text: () => 'contextual-image-data'
      }
    };
    mockModel.generateContent.mockResolvedValue(mockResult);

    const context = {
      messages: [
        { role: 'assistant', content: 'Previous context about cats' }
      ]
    };

    await GoogleAIService.generateImage('cat image', context);

    expect(mockModel.generateContent).toHaveBeenCalledWith([
      'Context: Previous context about cats\n\nImage prompt: cat image'
    ]);
  });

  test('generates text successfully', async () => {
    const mockResult = {
      response: {
        text: () => 'Generated text response'
      }
    };
    mockModel.generateContent.mockResolvedValue(mockResult);

    const result = await GoogleAIService.generateText('test prompt');

    expect(result).toEqual({
      content: 'Generated text response',
      type: 'text',
      context: {
        messages: [
          { role: 'user', content: 'test prompt' },
          { role: 'assistant', content: 'Generated text response' }
        ]
      }
    });

    expect(mockGoogleAI.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
  });

  test('handles image generation API errors', async () => {
    mockModel.generateContent.mockRejectedValue(new Error('API Error'));

    await expect(GoogleAIService.generateImage('test prompt'))
      .rejects.toThrow('Failed to generate image: API Error');
  });

  test('handles text generation API errors', async () => {
    mockModel.generateContent.mockRejectedValue(new Error('API Error'));

    await expect(GoogleAIService.generateText('test prompt'))
      .rejects.toThrow('Failed to generate text: API Error');
  });

  test('throws error when client not initialized for image', async () => {
    process.env.REACT_APP_GOOGLE_API_KEY = '';
    jest.resetModules();
    const { default: ServiceWithoutKey } = await import('../services/GoogleAIService');

    await expect(ServiceWithoutKey.generateImage('test'))
      .rejects.toThrow('Google AI client not initialized. Please check your API key.');
  });

  test('throws error when client not initialized for text', async () => {
    process.env.REACT_APP_GOOGLE_API_KEY = '';
    jest.resetModules();
    const { default: ServiceWithoutKey } = await import('../services/GoogleAIService');

    await expect(ServiceWithoutKey.generateText('test'))
      .rejects.toThrow('Google AI client not initialized. Please check your API key.');
  });
});