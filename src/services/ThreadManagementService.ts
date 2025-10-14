// Thread Management Service
// Manages conversation threads, session state, and Brand Voice injection
// Ensures Brand Voice is only injected at the start of new threads

import type { ConversationContext, ChatMessage } from '../types/api';
import logger from '../utils/logger';

interface ThreadInfo {
  threadId: string;
  sessionId: string;
  createdAt: Date;
  lastMessageAt: Date;
  messages: ChatMessage[];
  brandVoiceInjected: boolean;
}

interface ThreadStorage {
  [threadId: string]: ThreadInfo;
}

class ThreadManagementService {
  private threads: ThreadStorage = {};
  private currentThreadId: string | null = null;

  /**
   * Create a new thread with Brand Voice as the first system message
   * @param brandVoice - Brand Voice content to inject as system message
   * @param initialPrompt - Optional initial user prompt
   * @returns threadId for the new thread
   */
  createThread(brandVoice?: string, initialPrompt?: string): string {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `session_${Date.now()}`;
    
    const messages: ChatMessage[] = [];
    
    // Add Brand Voice as first system message if provided
    if (brandVoice && brandVoice.trim().length > 0) {
      messages.push({
        role: 'system',
        content: brandVoice
      });
      logger.debug('[ThreadManagement] Created new thread with Brand Voice:', threadId);
    } else {
      logger.debug('[ThreadManagement] Created new thread without Brand Voice:', threadId);
    }
    
    // Add initial prompt if provided
    if (initialPrompt && initialPrompt.trim().length > 0) {
      messages.push({
        role: 'user',
        content: initialPrompt
      });
    }
    
    this.threads[threadId] = {
      threadId,
      sessionId,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messages,
      brandVoiceInjected: !!brandVoice
    };
    
    this.currentThreadId = threadId;
    
    return threadId;
  }

  /**
   * Append a message to an existing thread
   * @param threadId - Thread to append to
   * @param message - Message to append
   */
  appendMessage(threadId: string, message: ChatMessage): void {
    const thread = this.threads[threadId];
    
    if (!thread) {
      logger.warn('[ThreadManagement] Thread not found, creating new thread:', threadId);
      // If thread doesn't exist, create a new one
      const newThreadId = this.createThread();
      this.threads[newThreadId].messages.push(message);
      return;
    }
    
    thread.messages.push(message);
    thread.lastMessageAt = new Date();
    
    logger.debug('[ThreadManagement] Appended message to thread:', threadId, 'Total messages:', thread.messages.length);
  }

  /**
   * Get the conversation context for a thread
   * @param threadId - Thread to get context for
   * @returns ConversationContext with messages
   */
  getThreadContext(threadId: string): ConversationContext | null {
    const thread = this.threads[threadId];
    
    if (!thread) {
      logger.warn('[ThreadManagement] Thread not found:', threadId);
      return null;
    }
    
    return {
      messages: [...thread.messages] // Return a copy to prevent mutation
    };
  }

  /**
   * Get thread info
   * @param threadId - Thread to get info for
   */
  getThreadInfo(threadId: string): ThreadInfo | null {
    return this.threads[threadId] || null;
  }

  /**
   * Check if Brand Voice has been injected for a thread
   * @param threadId - Thread to check
   */
  hasBrandVoiceInjected(threadId: string): boolean {
    const thread = this.threads[threadId];
    return thread ? thread.brandVoiceInjected : false;
  }

  /**
   * Reset/clear a thread
   * @param threadId - Thread to reset
   */
  resetThread(threadId: string): void {
    delete this.threads[threadId];
    
    if (this.currentThreadId === threadId) {
      this.currentThreadId = null;
    }
    
    logger.debug('[ThreadManagement] Reset thread:', threadId);
  }

  /**
   * Get current active thread ID
   */
  getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  /**
   * Set current active thread
   * @param threadId - Thread to set as active
   */
  setCurrentThreadId(threadId: string): void {
    this.currentThreadId = threadId;
  }

  /**
   * Clear all threads
   */
  clearAllThreads(): void {
    this.threads = {};
    this.currentThreadId = null;
    logger.debug('[ThreadManagement] Cleared all threads');
  }
}

// Export singleton instance
export const threadManagementService = new ThreadManagementService();
export default threadManagementService;
