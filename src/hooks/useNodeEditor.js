// Custom hooks for node components to reduce code duplication
import { useState, useCallback, useRef, useEffect } from 'react';
import { TIMING } from '../constants/app';
import logger from '../utils/logger';
import inputSanitizer from '../utils/inputSanitizer';

/**
 * Hook for managing node editing state
 * @param {string} initialPrompt - Initial prompt value
 * @returns {Object} - Editing state and handlers
 */
export const useNodeEditor = (initialPrompt = '') => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(initialPrompt);
  const textareaRef = useRef(null);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    // Focus the textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, TIMING.FOCUS_DELAY);
  }, []);

  const setEditingMode = useCallback((editing) => {
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
 * @returns {Object} - Processing state and handlers
 */
export const useNodeProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleProcess = useCallback(async (processFn) => {
    setIsProcessing(true);
    setError(null);
    try {
      await processFn();
    } catch (err) {
      logger.error('Error processing node:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setProcessingState = useCallback((processing) => {
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
 * @param {Object} data - Node data containing onReceiveInput callback
 * @returns {Object} - Input context state and handlers
 */
export const useNodeInput = (data) => {
  const [inputContext, setInputContext] = useState(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);

  // Destructure onReceiveInput to prevent dependency on entire data object
  const { onReceiveInput } = data;

  // Set up input listener whenever onReceiveInput changes
  useEffect(() => {
    logger.debug('[useNodeInput] Setting up input listener, onReceiveInput:', !!onReceiveInput);
    if (onReceiveInput) {
      onReceiveInput((inputData) => {
        logger.debug(`[useNodeInput] Received input:`, inputData);
        logger.debug(`[useNodeInput] Context:`, inputData.context);
        logger.debug(`[useNodeInput] Context messages:`, inputData.context?.messages?.length);
        setInputContext(inputData.context);
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
 * @param {string} initialPrompt - Initial prompt value
 * @param {Object} data - Node data
 * @param {string} id - Node ID
 * @returns {Object} - Combined state and handlers for prompt nodes
 */
export const usePromptNode = (initialPrompt, data, id) => {
  const editor = useNodeEditor(initialPrompt);
  const processing = useNodeProcessing();
  const input = useNodeInput(data);

  // Destructure data properties to optimize dependency arrays
  const { onOutput, systemPrompt: dataSystemPrompt } = data;
  
  const systemPrompt = dataSystemPrompt || 
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT || 
    'You are a helpful AI assistant.';

  const executePrompt = useCallback(async (service, prompt, systemPrompt, context = null) => {
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

          if (ctx.content && ctx.content.fullText) {
            // Use full text if available
            contextText = ctx.content.fullText;
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

    const response = await service.generateResponse(enhancedPrompt, sanitizedSystemPrompt, context);
    
    // Emit the response through the output
    if (onOutput) {
      onOutput({
        nodeId: id,
        content: response.content,
        context: response.context,
        type: response.type || 'text'
      });
    }

    return response;
  }, [onOutput, id, data.fileContexts]);

  const handleKeyDown = useCallback(async (e, service) => {
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