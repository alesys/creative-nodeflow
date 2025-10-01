// Image Prompt Node - Uses Google Gemini for image generation
import React, { useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position } from '@xyflow/react';
import GoogleAIService from '../services/GoogleAIService';
import { usePromptNode } from '../hooks/useNodeEditor.js';

const ImagePromptNode = ({ data, id, isConnectable }) => {
  const {
    isEditing,
    setIsEditing,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick,
    isProcessing,
    error,
    inputContext,
    hasReceivedInput,
    setupInputListener,
    handleProcess,
    setError
  } = usePromptNode(data.prompt || '', data, id);

  // Listen for incoming context from connected nodes (optional for image generation)
  useEffect(() => {
    setupInputListener();
  }, [setupInputListener]);

  // Destructure onOutput from data to optimize dependency array
  const { onOutput } = data;

  // Custom image generation using optimized hook patterns
  const generateImage = useCallback(async () => {
    if (!GoogleAIService.isConfigured()) {
      throw new Error('Google API key not configured. Please check your .env file.');
    }

    const response = await GoogleAIService.generateImage(prompt, inputContext);
    
    // Emit the response through the output
    if (onOutput) {
      onOutput({
        nodeId: id,
        content: response.content,
        context: response.context,
        type: 'image'
      });
    }

    return response;
  }, [prompt, inputContext, onOutput, id]);

  const handleKeyDown = useCallback(async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Switch from editing to render mode
      setIsEditing(false);
      
      if (!prompt.trim()) {
        setError('Please enter an image prompt first');
        return;
      }

      // Use the optimized handleProcess from the hook
      await handleProcess(generateImage);
    }
  }, [prompt, setIsEditing, setError, handleProcess, generateImage]);

  const getConnectionStatus = () => {
    if (hasReceivedInput) {
      return {
        icon: '✅',
        text: 'Context received',
        color: '#059669'
      };
    }
    return {
      icon: '🔗',
      text: 'No input (standalone mode)',
      color: '#6b7280'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
      {/* Node Header with Design System Gradient */}
      <div className="node-header model-loader">
        Image Generator
      </div>

      {/* Node Body */}
      <div className="node-body">
        


        {/* Connection Status Control */}
        <div className="parameter-control" style={{ borderBottom: 'none' }}>
          <span className="control-label">Status</span>
          <span 
            className="control-value" 
            style={{ color: connectionStatus.color }}
          >
            {connectionStatus.icon} {connectionStatus.text}
          </span>
        </div>

        {/* Text Area Control */}
        {isEditing ? (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              className="nodrag textarea-control"
              placeholder="Describe the image you want to generate... Press Ctrl+Enter to create"
            />
            <div className="helper-text helper-text-margined">
              Press Ctrl+Enter to generate image • Click outside to preview
            </div>
          </div>
        ) : (
          <div 
            onClick={handleEditClick}
            className="textarea-control"
            style={{ 
              cursor: 'pointer', 
              minHeight: 'var(--textarea-min-height)',
              marginTop: 'var(--spacing-sm)'
            }}
          >
            {prompt ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt}
              </ReactMarkdown>
            ) : (
              <span className="helper-text helper-text-italic">
                Click to add image prompt...
              </span>
            )}
          </div>
        )}

        {/* Context Display */}
        {inputContext && (
          <details className="details-section" style={{ marginTop: 'var(--spacing-sm)' }}>
            <summary className="helper-text summary-clickable">
              Input Context (will influence generation)
            </summary>
            <div style={{ marginTop: 'var(--spacing-xs)' }}>
              {inputContext.messages?.slice(-2).map((msg, idx) => (
                <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                  {msg.content.length > 80 && '...'}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Model Info */}
        <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
          <span className="control-label">Model</span>
          <span className="control-value control-value monospace">
            Gemini 2.5 Flash
          </span>
        </div>

        {/* Status Indicators */}
        {isProcessing && (
          <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
            <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
              🔄 Generating image with Nano Banana...
            </span>
          </div>
        )}

        {error && (
          <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
            <span className="control-label" style={{ color: 'var(--color-accent-error)' }}>
              ⚠️ {error}
            </span>
          </div>
        )}

      </div>

      {/* ReactFlow Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="react-flow__handle"
      />
      
      {/* ReactFlow Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle"
      />
    </div>
  );
};

export default ImagePromptNode;