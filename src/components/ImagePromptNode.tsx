// Art Director Node - Uses Google Gemini for image generation
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import GoogleAIService from '../services/GoogleAIService';
import { usePromptNode } from '../hooks/useNodeEditor';
import type { ImagePromptNodeData } from '../types/nodes';

interface ImagePromptNodeProps {
  data: ImagePromptNodeData;
  id: string;
  isConnectable: boolean;
}

const ImagePromptNode: React.FC<ImagePromptNodeProps> = ({ data, id, isConnectable }) => {
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
    handleProcess,
    setError
  } = usePromptNode(data.prompt || '', data, id);

  // Input listener is now set up automatically by useNodeInput hook

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

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();

      // Switch from editing to render mode
      setIsEditing(false);

      if (!prompt.trim()) {
        setError('Please enter art direction first');
        return;
      }

      // Use the optimized handleProcess from the hook
      await handleProcess(async () => {
        await generateImage();
      });
    }
  }, [prompt, setIsEditing, setError, handleProcess, generateImage]);

  const getConnectionStatus = () => {
    if (hasReceivedInput) {
      return {
        text: 'Context received',
        color: '#059669'
      };
    }
    return {
      text: 'No input (standalone mode)',
      color: '#6b7280'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
        {/* ReactFlow Native Resize Control */}
        <NodeResizer
          minWidth={320}
          minHeight={240}
        />      {/* Node Header with Design System Gradient */}
      <div className="node-header model-loader">
        Art Director
      </div>

      {/* Compact Status Bar */}
      <div className="image-status-bar">
        <div className="status-item">
          <span className="status-text" style={{ color: connectionStatus.color }}>{connectionStatus.text}</span>
        </div>
      </div>

      {/* Node Body */}
      <div className="node-body">
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
              Press Ctrl+Enter to execute
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
                Click to add art direction...
              </span>
            )}
          </div>
        )}

        {/* Context Display - Always show to indicate connection status */}
        <details className="details-section" style={{ marginTop: 'var(--spacing-sm)' }}>
          <summary className="helper-text summary-clickable">
            {hasReceivedInput ? (
              'Input Context (will influence generation)'
            ) : (
              'Input Context (waiting for connection)'
            )}
          </summary>
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            {hasReceivedInput && inputContext?.messages ? (
              inputContext.messages.slice(-2).map((msg, idx) => (
                <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                  {msg.content.length > 80 && '...'}
                </div>
              ))
            ) : (
              <div className="helper-text helper-text-small">
                {hasReceivedInput ? 'No context messages available' : 'Connect an input node to see context here'}
              </div>
            )}
          </div>
        </details>

        {/* Model Info - Hidden */}
        {/*
        <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
          <span className="control-label">Model</span>
          <span className="control-value control-value monospace">
            Gemini 2.5 Flash
          </span>
        </div>
        */}

        {/* Status Area - Always present to prevent layout shifts */}
        <div className="status-area" style={{ marginTop: 'var(--spacing-sm)', minHeight: '24px' }}>
          {isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
                Generating image with Nano Banana...
              </span>
            </div>
          )}

          {error && !isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-error)' }}>
                {error}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ReactFlow Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="react-flow__handle"
        isConnectable={isConnectable}
      />

      {/* ReactFlow Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle"
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default ImagePromptNode;
