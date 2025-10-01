// Custom hooks for node components to reduce code duplication
import { useState, useCallback, useRef } from 'react';
import { TIMING } from '../constants/app.js';

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
      console.error('Error processing node:', err);
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

  const setupInputListener = useCallback(() => {
    if (onReceiveInput) {
      onReceiveInput((inputData) => {
        setInputContext(inputData.context);
        setHasReceivedInput(true);
      });
    }
  }, [onReceiveInput]);

  return {
    inputContext,
    hasReceivedInput,
    setupInputListener,
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

    const response = await service.generateResponse(prompt, systemPrompt, context);
    
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
  }, [onOutput, id]);

  const handleKeyDown = useCallback(async (e, service) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Switch from editing to render mode
      editor.setIsEditing(false);
      processing.clearError();
      
      if (!editor.prompt.trim()) {
        processing.setError('Please enter a prompt first');
        return;
      }

      await processing.handleProcess(async () => {
        await executePrompt(service, editor.prompt, systemPrompt, input.inputContext);
      });
    }
  }, [editor, processing, input.inputContext, systemPrompt, executePrompt]);

  return {
    ...editor,
    ...processing,
    ...input,
    systemPrompt,
    executePrompt,
    handleKeyDown
  };
};