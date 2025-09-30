// Test utilities and setup for API service testing
import { jest } from '@jest/globals';

// Mock environment variables
const mockEnvVars = {
  REACT_APP_OPENAI_API_KEY: 'test-openai-key',
  REACT_APP_GOOGLE_API_KEY: 'test-google-key',
  REACT_APP_DEFAULT_SYSTEM_PROMPT: 'Test system prompt'
};

// Setup environment for tests
export const setupTestEnvironment = () => {
  // Mock process.env
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ...mockEnvVars
    };
  });
  
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });
};

// Mock fetch for API calls
export const mockFetch = () => {
  global.fetch = jest.fn();
  return global.fetch;
};

// Test data helpers
export const createMockResponse = (data, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

export const createMockOpenAIResponse = (content = 'Test response') => ({
  choices: [
    {
      message: {
        content,
        role: 'assistant'
      }
    }
  ]
});

export const createMockGoogleAIResponse = (content = 'Test response') => ({
  response: {
    text: () => content
  }
});

// Node test helpers
export const createMockNodeData = (overrides = {}) => ({
  prompt: 'test prompt',
  onOutput: jest.fn(),
  onReceiveInput: jest.fn(),
  ...overrides
});

export const createMockNodeProps = (overrides = {}) => ({
  id: 'test-node-1',
  data: createMockNodeData(),
  isConnectable: true,
  ...overrides
});