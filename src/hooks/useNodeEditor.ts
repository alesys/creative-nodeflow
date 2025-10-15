// Custom hooks for node components to reduce code duplication
import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { TIMING } from '../constants/app';
import logger from '../utils/logger';
import inputSanitizer from '../utils/inputSanitizer';
import threadManagementService from '../services/ThreadManagementService';
import type { ConversationContext } from '../types/api';
import type { PromptNodeData, AIService, InputData } from '../types/nodes';

// ============================================================================
// Hook Return Types
// ============================================================================

interface UseNodeEditorReturn {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  handleEditClick: () => void;
}

interface UseNodeProcessingReturn {
  isProcessing: boolean;
  error: string | null;
  handleProcess: (processFn: () => Promise<void>) => Promise<void>;
  clearError: () => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
}

interface UseNodeInputReturn {
  inputContext: ConversationContext | null;
  hasReceivedInput: boolean;
  setInputContext: (context: ConversationContext | null) => void;
  setHasReceivedInput: (received: boolean) => void;
}

interface UsePromptNodeReturn extends UseNodeEditorReturn, UseNodeProcessingReturn, UseNodeInputReturn {
  systemPrompt: string;
  threadId: string | null;
  setThreadId: (threadId: string | null) => void;
  executePrompt: (
    service: AIService,
    prompt: string,
    systemPrompt: string,
    context?: ConversationContext | null,
    isStartingPrompt?: boolean
  ) => Promise<{ content: string; context: ConversationContext }>;
  handleKeyDown: (e: React.KeyboardEvent, service: AIService, isStartingPrompt?: boolean) => Promise<void>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for managing node editing state
 */
export const useNodeEditor = (initialPrompt: string = ''): UseNodeEditorReturn => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(initialPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    // Focus the textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, TIMING.FOCUS_DELAY);
  }, []);

  const setEditingMode = useCallback((editing: boolean) => {
    setIsEditing(editing);
  }, []);

  return {
    isEditing,
    setIsEditing: setEditingMode,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick
  };
};

/**
 * Hook for managing node processing state and error handling
 */
export const useNodeProcessing = (): UseNodeProcessingReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleProcess = useCallback(async (processFn: () => Promise<void>) => {
    setIsProcessing(true);
    setError(null);
    try {
      await processFn();
    } catch (err) {
      logger.error('Error processing node:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setProcessingState = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  return {
    isProcessing,
    error,
    handleProcess,
    clearError,
    setProcessing: setProcessingState,
    setError
  };
};

/**
 * Hook for managing input context from connected nodes
 * Accumulates context from multiple inputs by merging messages
 */
export const useNodeInput = (data: Pick<PromptNodeData, 'onReceiveInput'>): UseNodeInputReturn => {
  const [inputContext, setInputContext] = useState<ConversationContext | null>(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);

  // Destructure onReceiveInput to prevent dependency on entire data object
  const { onReceiveInput } = data;

  // Set up input listener whenever onReceiveInput changes
  useEffect(() => {
    logger.debug('[useNodeInput] Setting up input listener, onReceiveInput:', !!onReceiveInput);
    if (onReceiveInput) {
      onReceiveInput((inputData: InputData) => {
        logger.debug('[useNodeInput] Received input:', inputData);
        logger.debug('[useNodeInput] Context:', inputData.context);
        logger.debug('[useNodeInput] Context messages:', inputData.context?.messages?.length);

        // Merge new context with existing context
        setInputContext(prevContext => {
          if (!inputData.context) {
            return prevContext;
          }

          if (!prevContext) {
            // No previous context, use new context
            return inputData.context;
          }

          // Merge messages from both contexts, preserve threadId
          const existingMessages = prevContext.messages || [];
          const newMessages = inputData.context.messages || [];

          logger.debug('[useNodeInput] Merging contexts - existing:', existingMessages.length, 'new:', newMessages.length);

          return {
            messages: [...existingMessages, ...newMessages],
            threadId: inputData.context.threadId || prevContext.threadId
          };
        });

        setHasReceivedInput(true);
      });
    }
  }, [onReceiveInput]);

  return {
    inputContext,
    hasReceivedInput,
    setInputContext,
    setHasReceivedInput
  };
};

/**
 * Combined hook for prompt nodes with common functionality
 */
export const usePromptNode = (
  initialPrompt: string,
  data: PromptNodeData,
  id: string,
  inputNodes?: any[]
): UsePromptNodeReturn => {
  const editor = useNodeEditor(initialPrompt);
  const processing = useNodeProcessing();
  const input = useNodeInput(data);

  // Thread management state
  const [threadId, setThreadId] = useState<string | null>(data.threadId || null);

  // Update threadId if it comes from input context (from upstream nodes)
  useEffect(() => {
    if (input.inputContext?.threadId && input.inputContext.threadId !== threadId) {
      logger.debug('[usePromptNode] Adopting threadId from input context:', input.inputContext.threadId);
      setThreadId(input.inputContext.threadId);
    }
  }, [input.inputContext, threadId]);

  // Destructure data properties to optimize dependency arrays
  const { onOutput, systemPrompt: dataSystemPrompt } = data;

  const systemPrompt = dataSystemPrompt ||
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT ||
    'You are a helpful AI assistant.';

  const executePrompt = useCallback(async (
    service: AIService,
    prompt: string,
    _systemPrompt: string, // Kept for backward compatibility, not used with thread management
    context: ConversationContext | null = null,
    isStartingPrompt: boolean = false
  ) => {
    if (!service.isConfigured()) {
      throw new Error(`${service.constructor.name} not configured. Please check your .env file.`);
    }

    // Sanitize inputs before processing
    const sanitizedPrompt = inputSanitizer.sanitizePrompt(prompt);

    if (!sanitizedPrompt) {
      throw new Error('Prompt is empty or contains only invalid characters');
    }

    // Thread Management: Create new thread or use existing
    let currentThreadId = threadId;
    let threadContext: ConversationContext;

    if (isStartingPrompt || !currentThreadId) {
      // Starting Prompt: Create new thread with Brand Voice
      const brandVoice = localStorage.getItem('brandInstructions') || '';
      currentThreadId = threadManagementService.createThread(brandVoice);
      setThreadId(currentThreadId);
      logger.debug('[useNodeEditor] Created new thread with Brand Voice:', currentThreadId);
      
      // Get thread context (contains Brand Voice as system message)
      threadContext = threadManagementService.getThreadContext(currentThreadId) || { messages: [] };
    } else {
      // Follow-up prompt: Use existing thread (no Brand Voice re-injection)
      logger.debug('[useNodeEditor] Using existing thread:', currentThreadId);
      
      // Get existing thread context
      threadContext = threadManagementService.getThreadContext(currentThreadId) || { messages: [] };
    }

    // Build enhanced prompt and context for multimodal (image) support
    let enhancedPrompt = sanitizedPrompt;
    let multimodalContext: ConversationContext | null = context ? { ...context } : { messages: [] };

    // Gather fileContexts as before
    let allFileContexts = Array.isArray(data.fileContexts) ? [...data.fileContexts] : [];

    // Try to gather image context from connected input nodes (imagePrompt, imagePanel)
    if (inputNodes && Array.isArray(inputNodes)) {
      inputNodes.forEach((inputNode: any) => {
        // ImagePrompt: generated image
        if (inputNode.type === 'imagePrompt' && inputNode.data && inputNode.data.generatedImageUrl) {
          allFileContexts.push({
            fileId: inputNode.id,
            fileName: inputNode.data.prompt || 'Generated Image',
            content: { type: 'image', imageUrl: inputNode.data.generatedImageUrl },
            contextPrompt: inputNode.data.prompt
          });
        }
        // ImagePanel: uploaded image
        if (inputNode.type === 'imagePanel' && inputNode.data && inputNode.data.imageUrl) {
          allFileContexts.push({
            fileId: inputNode.id,
            fileName: 'Uploaded Image',
            content: { type: 'image', imageUrl: inputNode.data.imageUrl },
            contextPrompt: inputNode.data.contextPrompt || 'Image uploaded via Image Panel'
          });
        }
      });
    }


    if (allFileContexts.length > 0) {
      logger.debug('[useNodeEditor] Building context from file contexts:', allFileContexts);
      const contextMessages = allFileContexts.map(ctx => {
        // Normalize image context from FilePanel/Resource Files
        const isObj = (val: any): val is { type?: string; url?: string; imageUrl?: string; fullText?: string; name?: string } =>
          typeof val === 'object' && val !== null;


        // Detect image file from FilePanel (type: 'image', content may have url or imageUrl)
        if (
          (ctx.type === 'image' || (isObj(ctx.content) && (ctx.content.type === 'image' || ctx.content.type?.startsWith('image/')))) &&
          isObj(ctx.content)
        ) {
          const imageUrl = ctx.content.url || ctx.content.imageUrl;
          if (typeof imageUrl === 'string' && imageUrl.length > 0) {
            // Extract mimeType from data URL or default to image/png
            const mimeType = typeof imageUrl === 'string' && imageUrl.startsWith('data:')
              ? imageUrl.split(';')[0].split(':')[1] || 'image/png'
              : 'image/png';
            
            return {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: ctx.contextPrompt || ctx.summary || 'Image uploaded as context.' },
                { type: 'image' as const, imageUrl, mimeType }
              ]
            };
          }
        }

        // Otherwise, treat as text context
        let contextText = '';
        if (isObj(ctx.content) && 'fullText' in ctx.content && ctx.content.fullText) {
          contextText = ctx.content.fullText;
        } else if (ctx.contextPrompt) {
          contextText = ctx.contextPrompt;
        } else if (ctx.summary) {
          contextText = ctx.summary;
        } else if (ctx.content) {
          contextText = typeof ctx.content === 'string' ? ctx.content : JSON.stringify(ctx.content, null, 2);
        } else {
          contextText = 'File context (ID: ' + ctx.fileId + ')';
        }
        return {
          role: 'user' as const,
          content: contextText
        };
      });

      // Add all file context messages to the multimodal context
      multimodalContext.messages = [...(multimodalContext.messages || []), ...contextMessages];

      // For prompt, still include a summary for user reference
      const contextSummary = allFileContexts
        .map(ctx => {
          const isObj = (val: any): val is { fullText?: string; url?: string } => typeof val === 'object' && val !== null;
          if (ctx.contextPrompt) return ctx.contextPrompt;
          if (ctx.summary) return ctx.summary;
          if (isObj(ctx.content) && ctx.content.fullText) return ctx.content.fullText;
          if (isObj(ctx.content) && ctx.content.url) return ctx.content.url;
          if (typeof ctx.content === 'string') return ctx.content;
          return ctx.fileId;
        })
        .join('\n\n---\n\n');

      enhancedPrompt = 'Context from uploaded files:\n' +
        contextSummary +
        '\n\n---\n\nUser request:\n' +
        prompt;

      logger.debug('[useNodeEditor] Enhanced prompt length:', enhancedPrompt.length);
      logger.debug('[useNodeEditor] Enhanced prompt preview:', enhancedPrompt.substring(0, 300) + '...');
    }

    if (!service.generateResponse) {
      throw new Error('Service does not support text generation');
    }

    // Merge multimodal context (file contexts) with thread context
    let finalContext = threadContext;
    if (multimodalContext && multimodalContext.messages && multimodalContext.messages.length > 0) {
      // Merge file context messages with thread messages
      finalContext = {
        ...threadContext,
        messages: [...threadContext.messages, ...multimodalContext.messages],
        threadId: currentThreadId
      };
      logger.debug('[useNodeEditor] Merged file contexts with thread context');
    } else {
      finalContext = {
        ...threadContext,
        threadId: currentThreadId
      };
    }

    // Call AI service with thread context (Brand Voice already in thread if it was a Starting Prompt)
    // System prompt is NOT passed here because Brand Voice is already in the thread's system message
    const response = await service.generateResponse(
      (data.fileContexts && data.fileContexts.length > 0) ? enhancedPrompt : sanitizedPrompt,
      null, // No system prompt - Brand Voice is in thread context
      finalContext
    );

    // Update thread with user prompt and assistant response
    if (currentThreadId) {
      // Add user message
      threadManagementService.appendMessage(currentThreadId, {
        role: 'user',
        content: sanitizedPrompt
      });
      
      // Add assistant response
      threadManagementService.appendMessage(currentThreadId, {
        role: 'assistant',
        content: response.content
      });
      
      logger.debug('[useNodeEditor] Updated thread with user prompt and assistant response');
    }

    // Emit the response through the output with thread context
    if (onOutput) {
      onOutput({
        nodeId: id,
        content: response.content,
        context: {
          ...response.context,
          threadId: currentThreadId
        },
        type: 'text'
      });
    }

    return {
      ...response,
      context: {
        ...response.context,
        threadId: currentThreadId
      }
    };
  }, [onOutput, id, data.fileContexts, threadId]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent, service: AIService, isStartingPrompt: boolean = false) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();

      logger.debug('[usePromptNode] Ctrl+Enter pressed');
      logger.debug('[usePromptNode] Has received input:', input.hasReceivedInput);
      logger.debug('[usePromptNode] Input context:', input.inputContext);
      logger.debug('[usePromptNode] Is starting prompt:', isStartingPrompt);

      // Switch from editing to render mode
      editor.setIsEditing(false);
      processing.clearError();

      if (!editor.prompt.trim()) {
        processing.setError('Please enter a prompt first');
        return;
      }

      await processing.handleProcess(async () => {
        logger.debug('[usePromptNode] Executing prompt with context:', input.inputContext);
        await executePrompt(service, editor.prompt, systemPrompt, input.inputContext, isStartingPrompt);
      });
    }
  }, [editor, processing, input.inputContext, input.hasReceivedInput, systemPrompt, executePrompt]);

  return {
    ...editor,
    ...processing,
    ...input,
    systemPrompt,
    threadId,
    setThreadId,
    executePrompt,
    handleKeyDown
  };
};
