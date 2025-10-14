// Thread Management Service Tests
// Manual test scenarios to verify thread and Brand Voice management

import threadManagementService from '../ThreadManagementService';

describe('ThreadManagementService', () => {
  beforeEach(() => {
    // Clear all threads before each test
    threadManagementService.clearAllThreads();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Thread Creation', () => {
    test('should create thread with Brand Voice', () => {
      const brandVoice = 'You are a helpful assistant.';
      const threadId = threadManagementService.createThread(brandVoice);

      expect(threadId).toBeTruthy();
      expect(threadId).toMatch(/^thread_/);

      const context = threadManagementService.getThreadContext(threadId);
      expect(context).toBeTruthy();
      expect(context?.messages).toHaveLength(1);
      expect(context?.messages[0].role).toBe('system');
      expect(context?.messages[0].content).toBe(brandVoice);

      const threadInfo = threadManagementService.getThreadInfo(threadId);
      expect(threadInfo?.brandVoiceInjected).toBe(true);
    });

    test('should create thread without Brand Voice', () => {
      const threadId = threadManagementService.createThread();

      expect(threadId).toBeTruthy();

      const context = threadManagementService.getThreadContext(threadId);
      expect(context).toBeTruthy();
      expect(context?.messages).toHaveLength(0);

      const threadInfo = threadManagementService.getThreadInfo(threadId);
      expect(threadInfo?.brandVoiceInjected).toBe(false);
    });

    test('should create thread with initial prompt', () => {
      const brandVoice = 'You are a poet.';
      const initialPrompt = 'Write a haiku';
      const threadId = threadManagementService.createThread(brandVoice, initialPrompt);

      const context = threadManagementService.getThreadContext(threadId);
      expect(context?.messages).toHaveLength(2);
      expect(context?.messages[0].role).toBe('system');
      expect(context?.messages[0].content).toBe(brandVoice);
      expect(context?.messages[1].role).toBe('user');
      expect(context?.messages[1].content).toBe(initialPrompt);
    });
  });

  describe('Message Appending', () => {
    test('should append user message to thread', () => {
      const threadId = threadManagementService.createThread('Brand Voice');

      threadManagementService.appendMessage(threadId, {
        role: 'user',
        content: 'Hello'
      });

      const context = threadManagementService.getThreadContext(threadId);
      expect(context?.messages).toHaveLength(2);
      expect(context?.messages[1].role).toBe('user');
      expect(context?.messages[1].content).toBe('Hello');
    });

    test('should append assistant message to thread', () => {
      const threadId = threadManagementService.createThread('Brand Voice');

      threadManagementService.appendMessage(threadId, {
        role: 'user',
        content: 'Hello'
      });

      threadManagementService.appendMessage(threadId, {
        role: 'assistant',
        content: 'Hi there!'
      });

      const context = threadManagementService.getThreadContext(threadId);
      expect(context?.messages).toHaveLength(3);
      expect(context?.messages[2].role).toBe('assistant');
      expect(context?.messages[2].content).toBe('Hi there!');
    });

    test('should maintain conversation order', () => {
      const threadId = threadManagementService.createThread('Brand Voice');

      const messages = [
        { role: 'user' as const, content: 'First' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'Second' },
        { role: 'assistant' as const, content: 'Response 2' }
      ];

      messages.forEach(msg => threadManagementService.appendMessage(threadId, msg));

      const context = threadManagementService.getThreadContext(threadId);
      expect(context?.messages).toHaveLength(5); // 1 system + 4 messages
      expect(context?.messages[0].role).toBe('system');
      expect(context?.messages[1].content).toBe('First');
      expect(context?.messages[2].content).toBe('Response 1');
      expect(context?.messages[3].content).toBe('Second');
      expect(context?.messages[4].content).toBe('Response 2');
    });
  });

  describe('Thread Management', () => {
    test('should get current thread ID', () => {
      const threadId = threadManagementService.createThread('Brand Voice');
      expect(threadManagementService.getCurrentThreadId()).toBe(threadId);
    });

    test('should set current thread ID', () => {
      const threadId1 = threadManagementService.createThread('Brand Voice 1');
      const threadId2 = threadManagementService.createThread('Brand Voice 2');

      threadManagementService.setCurrentThreadId(threadId1);
      expect(threadManagementService.getCurrentThreadId()).toBe(threadId1);

      threadManagementService.setCurrentThreadId(threadId2);
      expect(threadManagementService.getCurrentThreadId()).toBe(threadId2);
    });

    test('should reset thread', () => {
      const threadId = threadManagementService.createThread('Brand Voice');
      threadManagementService.appendMessage(threadId, { role: 'user', content: 'Test' });

      expect(threadManagementService.getThreadContext(threadId)).toBeTruthy();

      threadManagementService.resetThread(threadId);

      expect(threadManagementService.getThreadContext(threadId)).toBeNull();
    });

    test('should clear all threads', () => {
      const threadId1 = threadManagementService.createThread('Brand Voice 1');
      const threadId2 = threadManagementService.createThread('Brand Voice 2');

      threadManagementService.clearAllThreads();

      expect(threadManagementService.getThreadContext(threadId1)).toBeNull();
      expect(threadManagementService.getThreadContext(threadId2)).toBeNull();
      expect(threadManagementService.getCurrentThreadId()).toBeNull();
    });
  });

  describe('Brand Voice Tracking', () => {
    test('should track Brand Voice injection', () => {
      const threadWithBV = threadManagementService.createThread('Brand Voice');
      const threadWithoutBV = threadManagementService.createThread();

      expect(threadManagementService.hasBrandVoiceInjected(threadWithBV)).toBe(true);
      expect(threadManagementService.hasBrandVoiceInjected(threadWithoutBV)).toBe(false);
    });

    test('should not re-inject Brand Voice on append', () => {
      const brandVoice = 'You are a helpful assistant.';
      const threadId = threadManagementService.createThread(brandVoice);

      // Append multiple messages
      for (let i = 0; i < 5; i++) {
        threadManagementService.appendMessage(threadId, {
          role: 'user',
          content: `Message ${i}`
        });
        threadManagementService.appendMessage(threadId, {
          role: 'assistant',
          content: `Response ${i}`
        });
      }

      const context = threadManagementService.getThreadContext(threadId);
      const systemMessages = context?.messages.filter(m => m.role === 'system') || [];

      // Should only have ONE system message (Brand Voice)
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toBe(brandVoice);
    });
  });
});

// Integration test scenario
describe('Thread Management Integration', () => {
  beforeEach(() => {
    threadManagementService.clearAllThreads();
    localStorage.setItem('brandInstructions', 'You are a professional writer.');
  });

  test('Scenario: Starting Prompt creates thread, Creative Director continues it', () => {
    // Simulate Starting Prompt execution
    const brandVoice = localStorage.getItem('brandInstructions') || '';
    const startingPromptThreadId = threadManagementService.createThread(brandVoice);

    // Add user message
    threadManagementService.appendMessage(startingPromptThreadId, {
      role: 'user',
      content: 'Write about nature'
    });

    // Simulate assistant response
    threadManagementService.appendMessage(startingPromptThreadId, {
      role: 'assistant',
      content: 'Nature is beautiful and vast...'
    });

    const afterStartingPrompt = threadManagementService.getThreadContext(startingPromptThreadId);
    expect(afterStartingPrompt?.messages).toHaveLength(3); // system + user + assistant

    // Simulate Creative Director receiving context with threadId
    const creativeDirectorThreadId = startingPromptThreadId; // Uses same thread

    // Add follow-up message
    threadManagementService.appendMessage(creativeDirectorThreadId, {
      role: 'user',
      content: 'Make it more poetic'
    });

    // Simulate assistant response
    threadManagementService.appendMessage(creativeDirectorThreadId, {
      role: 'assistant',
      content: 'Nature whispers secrets in the wind...'
    });

    const afterCreativeDirector = threadManagementService.getThreadContext(creativeDirectorThreadId);
    expect(afterCreativeDirector?.messages).toHaveLength(5); // system + 2 user + 2 assistant

    // Verify Brand Voice only appears once
    const systemMessages = afterCreativeDirector?.messages.filter(m => m.role === 'system') || [];
    expect(systemMessages).toHaveLength(1);
    expect(systemMessages[0].content).toBe('You are a professional writer.');

    // Verify conversation order
    expect(afterCreativeDirector?.messages[0].role).toBe('system');
    expect(afterCreativeDirector?.messages[1].role).toBe('user');
    expect(afterCreativeDirector?.messages[1].content).toBe('Write about nature');
    expect(afterCreativeDirector?.messages[2].role).toBe('assistant');
    expect(afterCreativeDirector?.messages[3].role).toBe('user');
    expect(afterCreativeDirector?.messages[3].content).toBe('Make it more poetic');
    expect(afterCreativeDirector?.messages[4].role).toBe('assistant');
  });
});
