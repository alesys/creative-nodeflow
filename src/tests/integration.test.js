// Simple environment and service validation test
// Run with: npx jest --testNamePattern="Service Integration"

import OpenAIService from '../services/OpenAIService';
import GoogleAIService from '../services/GoogleAIService';

describe('Service Integration Tests', () => {
  beforeAll(() => {
    // Log environment state for debugging
    console.log('=== TEST ENVIRONMENT ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('OpenAI Key Present:', !!process.env.REACT_APP_OPENAI_API_KEY);
    console.log('Google Key Present:', !!process.env.REACT_APP_GOOGLE_API_KEY);
    console.log('========================');
  });

  describe('Environment Variables', () => {
    test('should have OpenAI API key in environment', () => {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      expect(apiKey).toBeTruthy();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(10);
      
      // Log for debugging but don't expose full key
      console.log('OpenAI key format check:', {
        present: !!apiKey,
        length: apiKey?.length || 0,
        startsWithSk: apiKey?.startsWith('sk-') || false,
        prefix: apiKey?.substring(0, 7) || 'none'
      });
    });

    test('should have Google API key in environment', () => {
      const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
      
      expect(apiKey).toBeTruthy();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(10);
      
      // Log for debugging but don't expose full key  
      console.log('Google key format check:', {
        present: !!apiKey,
        length: apiKey?.length || 0,
        prefix: apiKey?.substring(0, 10) || 'none'
      });
    });
  });

  describe('Service Configuration', () => {
    test('OpenAI service should initialize correctly', () => {
      const isConfigured = OpenAIService.isConfigured();
      
      console.log('OpenAI service configuration:', {
        configured: isConfigured,
        hasClient: !!OpenAIService.client
      });
      
      const expectedValue = process.env.REACT_APP_OPENAI_API_KEY ? true : false;
      expect(isConfigured).toBe(expectedValue);
    });

    test('Google AI service should initialize correctly', () => {
      const isConfigured = GoogleAIService.isConfigured();
      
      console.log('Google AI service configuration:', {
        configured: isConfigured,
        hasClient: !!GoogleAIService.client
      });
      
      const expectedValue = process.env.REACT_APP_GOOGLE_API_KEY ? true : false;
      expect(isConfigured).toBe(expectedValue);
    });
  });

  describe('API Key Detection Issue Diagnosis', () => {
    test('should diagnose common environment issues', () => {
      const diagnostics = {
        nodeEnv: process.env.NODE_ENV,
        reactAppVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')),
        openaiKeyPresent: !!process.env.REACT_APP_OPENAI_API_KEY,
        googleKeyPresent: !!process.env.REACT_APP_GOOGLE_API_KEY,
        openaiServiceWorking: OpenAIService.isConfigured(),
        googleServiceWorking: GoogleAIService.isConfigured()
      };

      console.log('=== DIAGNOSTIC REPORT ===');
      console.log('Environment:', diagnostics.nodeEnv);
      console.log('REACT_APP vars found:', diagnostics.reactAppVars.length);
      console.log('REACT_APP vars:', diagnostics.reactAppVars);
      console.log('OpenAI key in env:', diagnostics.openaiKeyPresent);
      console.log('Google key in env:', diagnostics.googleKeyPresent);
      console.log('OpenAI service working:', diagnostics.openaiServiceWorking);
      console.log('Google service working:', diagnostics.googleServiceWorking);
      console.log('=========================');

      // The test passes if we can collect diagnostics
      expect(diagnostics).toBeDefined();
      
      // If keys are present but services aren't working, that indicates an initialization issue
      if (diagnostics.openaiKeyPresent && !diagnostics.openaiServiceWorking) {
        console.warn('⚠️  OpenAI key present but service not working - check initialization');
      }
      
      if (diagnostics.googleKeyPresent && !diagnostics.googleServiceWorking) {
        console.warn('⚠️  Google key present but service not working - check initialization');
      }

      // If no REACT_APP vars found, that indicates environment not loaded
      if (diagnostics.reactAppVars.length === 0) {
        console.warn('⚠️  No REACT_APP variables found - environment not loaded properly');
      }
    });
  });
});