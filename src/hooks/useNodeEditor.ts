// Custom hooks for node components to reduce code duplication
import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { TIMING } from '../constants/app';
import logger from '../utils/logger';
import inputSanitizer from '../utils/inputSanitizer';
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
  executePrompt: (
    service: AIService,
    prompt: string,
    systemPrompt: string,
    context?: ConversationContext | null
  ) => Promise<{ content: string; context: ConversationContext }>;
  handleKeyDown: (e: React.KeyboardEvent, service: AIService) => Promise<void>;
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

          // Merge messages from both contexts
          const existingMessages = prevContext.messages || [];
          const newMessages = inputData.context.messages || [];

          logger.debug('[useNodeInput] Merging contexts - existing:', existingMessages.length, 'new:', newMessages.length);

          return {
            messages: [...existingMessages, ...newMessages]
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
  id: string
): UsePromptNodeReturn => {
  const editor = useNodeEditor(initialPrompt);
  const processing = useNodeProcessing();
  const input = useNodeInput(data);

  // Destructure data properties to optimize dependency arrays
  const { onOutput, systemPrompt: dataSystemPrompt } = data;

  const systemPrompt = dataSystemPrompt ||
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT ||
    'You are a helpful AI assistant.';

  const executePrompt = useCallback(async (
    service: AIService,
    prompt: string,
    systemPrompt: string,
    context: ConversationContext | null = null
  ) => {
    if (!service.isConfigured()) {
      throw new Error(`${service.constructor.name} not configured. Please check your .env file.`);
    }

    // Sanitize inputs before processing
    const sanitizedPrompt = inputSanitizer.sanitizePrompt(prompt);
    const sanitizedSystemPrompt = inputSanitizer.sanitizeSystemPrompt(systemPrompt);

    if (!sanitizedPrompt) {
      throw new Error('Prompt is empty or contains only invalid characters');
    }

    // Build enhanced prompt with file contexts if available
    let enhancedPrompt = sanitizedPrompt;
    if (data.fileContexts && data.fileContexts.length > 0) {
      logger.debug('[useNodeEditor] Building context from file contexts:', data.fileContexts);

      const contextSummary = data.fileContexts
        .map(ctx => {
          logger.debug('[useNodeEditor] Processing context:', ctx);

          // Try to get the most detailed content available
          let contextText = '';

          if (typeof ctx.content === 'object' && ctx.content !== null && 'fullText' in ctx.content) {
            // Use full text if available
            contextText = ctx.content.fullText as string;
            logger.debug('[useNodeEditor] Using fullText, length:', contextText.length);
          } else if (ctx.contextPrompt) {
            // Use contextPrompt (pre-formatted for prompts)
            contextText = ctx.contextPrompt;
            logger.debug('[useNodeEditor] Using contextPrompt');
          } else if (ctx.summary) {
            // Use summary as fallback
            contextText = ctx.summary;
            logger.debug('[useNodeEditor] Using summary');
          } else if (ctx.content) {
            // Try to stringify content object
            contextText = JSON.stringify(ctx.content, null, 2);
            logger.debug('[useNodeEditor] Stringified content object');
          } else {
            contextText = `File context (ID: ${ctx.fileId})`;
            logger.warn('[useNodeEditor] No usable context found, using placeholder');
          }

          return contextText;
        })
        .join('\n\n---\n\n');

      enhancedPrompt = `Context from uploaded files:
${contextSummary}

---

User request:
${prompt}`;

      logger.debug('[useNodeEditor] Enhanced prompt length:', enhancedPrompt.length);
      logger.debug('[useNodeEditor] Enhanced prompt preview:', enhancedPrompt.substring(0, 300) + '...');
    }

    if (!service.generateResponse) {
      throw new Error('Service does not support text generation');
    }

    const response = await service.generateResponse(enhancedPrompt, sanitizedSystemPrompt, context);

    // Emit the response through the output
    if (onOutput) {
      onOutput({
        nodeId: id,
        content: response.content,
        context: response.context,
        type: 'text'
      });
    }

    return response;
  }, [onOutput, id, data.fileContexts]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent, service: AIService) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();

      logger.debug('[usePromptNode] Ctrl+Enter pressed');
      logger.debug('[usePromptNode] Has received input:', input.hasReceivedInput);
      logger.debug('[usePromptNode] Input context:', input.inputContext);

      // Switch from editing to render mode
      editor.setIsEditing(false);
      processing.clearError();

      if (!editor.prompt.trim()) {
        processing.setError('Please enter a prompt first');
        return;
      }

      await processing.handleProcess(async () => {
        logger.debug('[usePromptNode] Executing prompt with context:', input.inputContext);
        await executePrompt(service, editor.prompt, systemPrompt, input.inputContext);
      });
    }
  }, [editor, processing, input.inputContext, input.hasReceivedInput, systemPrompt, executePrompt]);

  return {
    ...editor,
    ...processing,
    ...input,
    systemPrompt,
    executePrompt,
    handleKeyDown
  };
};
