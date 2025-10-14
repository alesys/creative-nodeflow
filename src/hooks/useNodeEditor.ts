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
  id: string,
  inputNodes?: any[]
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

    // Retrieve Brand Voice from localStorage
    const brandInstructions = localStorage.getItem('brandInstructions') || '';
    
    // Combine Brand Voice with system prompt
    let enhancedSystemPrompt = systemPrompt;
    if (brandInstructions.trim()) {
      enhancedSystemPrompt = `${brandInstructions}\n\n---\n\n${systemPrompt}`;
      logger.debug('[useNodeEditor] Enhanced system prompt with Brand Voice, total length:', enhancedSystemPrompt.length);
    }


    // Sanitize inputs before processing
    const sanitizedPrompt = inputSanitizer.sanitizePrompt(prompt);
    const sanitizedSystemPrompt = inputSanitizer.sanitizeSystemPrompt(enhancedSystemPrompt);

    if (!sanitizedPrompt) {
      throw new Error('Prompt is empty or contains only invalid characters');
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
            return {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: ctx.contextPrompt || ctx.summary || 'Image uploaded as context.' },
                { type: 'image' as const, imageUrl }
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


  // Use multimodalContext if fileContexts present, else fallback to original context
  const response = await service.generateResponse(enhancedPrompt, sanitizedSystemPrompt, (data.fileContexts && data.fileContexts.length > 0) ? multimodalContext : context);

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
