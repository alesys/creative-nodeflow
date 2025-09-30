// OpenAIService unit tests
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { setupTestEnvironment, createMockOpenAIResponse } from './testUtils';

// Mock OpenAI module
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('OpenAIService', () => {
  setupTestEnvironment();

  let OpenAIService;
  let mockOpenAI;

  beforeEach(async () => {
    // Import after mocking
    const OpenAI = (await import('openai')).default;
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    OpenAI.mockImplementation(() => mockOpenAI);
    
    // Import service after setting up mocks
    OpenAIService = (await import('../services/OpenAIService')).default;
  });

  test('initializes client with API key from environment', () => {
    expect(OpenAIService.isConfigured()).toBe(true);
  });

  test('handles missing API key gracefully', async () => {
    // Test with missing key
    process.env.REACT_APP_OPENAI_API_KEY = '';
    
    // Re-import to test initialization
    jest.resetModules();
    const { default: ServiceWithoutKey } = await import('../services/OpenAIService');
    
    expect(ServiceWithoutKey.isConfigured()).toBe(false);
  });

  test('generates response successfully', async () => {
    const mockResponse = createMockOpenAIResponse('Test AI response');
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const result = await OpenAIService.generateResponse('test prompt', 'test system prompt');

    expect(result).toEqual({
      content: 'Test AI response',
      context: {
        messages: [
          { role: 'system', content: 'test system prompt' },
          { role: 'user', content: 'test prompt' },
          { role: 'assistant', content: 'Test AI response' }
        ]
      }
    });

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'test system prompt' },
        { role: 'user', content: 'test prompt' }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });
  });

  test('generates response with context', async () => {
    const mockResponse = createMockOpenAIResponse('Follow-up response');
    mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

    const context = {
      messages: [
        { role: 'user', content: 'previous prompt' },
        { role: 'assistant', content: 'previous response' }
      ]
    };

    const result = await OpenAIService.generateResponse('new prompt', 'system prompt', context);

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'previous prompt' },
        { role: 'assistant', content: 'previous response' },
        { role: 'user', content: 'new prompt' }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });
  });

  test('handles API errors gracefully', async () => {
    mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

    await expect(OpenAIService.generateResponse('test prompt'))
      .rejects.toThrow('Failed to generate response: API Error');
  });

  test('throws error when client not initialized', async () => {
    // Create service without API key
    process.env.REACT_APP_OPENAI_API_KEY = '';
    jest.resetModules();
    const { default: ServiceWithoutKey } = await import('../services/OpenAIService');

    await expect(ServiceWithoutKey.generateResponse('test'))
      .rejects.toThrow('OpenAI client not initialized. Please check your API key.');
  });
});