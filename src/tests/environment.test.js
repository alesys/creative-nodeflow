// Quick environment validation test to check API key detection
import { describe, test, expect } from '@jest/globals';

describe('Environment Variables Validation', () => {
  test('OpenAI API key should be present', () => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    console.log('OpenAI Key in test:', apiKey ? `${apiKey.substring(0, 7)}...` : 'NOT FOUND');
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(apiKey).toMatch(/^sk-/);
  });

  test('Google API key should be present', () => {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    console.log('Google Key in test:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(apiKey.length).toBeGreaterThan(10);
  });

  test('System prompt should be present', () => {
    const systemPrompt = process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT;
    expect(systemPrompt).toBeDefined();
    expect(systemPrompt).not.toBe('');
  });

  test('should log all REACT_APP environment variables', () => {
    const reactAppVars = Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'));
    console.log('All REACT_APP variables found:', reactAppVars);
    console.log('Total REACT_APP variables:', reactAppVars.length);
    
    reactAppVars.forEach(key => {
      const value = process.env[key];
      console.log(`${key}:`, value ? `${value.substring(0, 10)}...` : 'EMPTY');
    });

    expect(reactAppVars.length).toBeGreaterThan(0);
  });
});