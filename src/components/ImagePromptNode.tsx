// Art Director Node - Uses Google Gemini for image generation
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GoogleAIService from '../services/GoogleAIService';
import { usePromptNode } from '../hooks/useNodeEditor';
import { BaseNode } from './base';
import type { ImagePromptNodeData } from '../types/nodes';
import type { NodeConfig } from '../types/nodeConfig';

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

  const [aspectRatio, setAspectRatio] = React.useState<string>(data.aspectRatio || '1:1');

  // Input listener is now set up automatically by useNodeInput hook

  // Destructure onOutput from data to optimize dependency array
  const { onOutput } = data;

  // Custom image generation using optimized hook patterns
  const generateImage = useCallback(async () => {
    if (!GoogleAIService.isConfigured()) {
      throw new Error('Google API key not configured. Please check your .env file.');
    }

    const response = await GoogleAIService.generateImage(prompt, inputContext, aspectRatio);

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
  }, [prompt, inputContext, aspectRatio, onOutput, id]);

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

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Art Director',
      variant: 'loader',
      icon: '🖼️'
    },
    statusBar: {
      show: true,
      status: isProcessing ? 'processing' : hasReceivedInput ? 'success' : 'idle',
      message: isProcessing 
        ? 'Generating image with Nano Banana...' 
        : connectionStatus.text,
      showProgress: isProcessing
    },
    connectors: {
      inputs: [
        {
          id: 'input-text',
          type: 'text',
          label: 'Context',
          position: 'middle'
        }
      ],
      outputs: [
        {
          id: 'output-image',
          type: 'image',
          label: 'Image',
          position: 'middle'
        }
      ]
    },
    resizable: true,
    error: error
  };

  return (
    <BaseNode id={id} isConnectable={isConnectable} config={nodeConfig}>
        {/* Text Area Control */}
        {isEditing ? (
          <div>
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
              minHeight: 'var(--textarea-min-height)'
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
        <details className="details-section">
          <summary className="helper-text summary-clickable">
            {hasReceivedInput ? (
              'Input Context (will influence generation)'
            ) : (
              'Input Context (waiting for connection)'
            )}
          </summary>
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            {hasReceivedInput && inputContext?.messages ? (
              inputContext.messages.slice(-2).map((msg, idx) => {
                // Handle multimodal content
                if (Array.isArray(msg.content)) {
                  return (
                    <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <strong>{msg.role}:</strong>
                      {msg.content.map((part, partIdx) => {
                        if (part.type === 'text') {
                          return (
                            <span key={partIdx}>
                              {' '}{part.text.substring(0, 80)}
                              {part.text.length > 80 && '...'}
                            </span>
                          );
                        } else if (part.type === 'image') {
                          return <span key={partIdx}> [Image]</span>;
                        }
                        return null;
                      })}
                    </div>
                  );
                } else {
                  // Handle simple text content
                  return (
                    <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                      {msg.content.length > 80 && '...'}
                    </div>
                  );
                }
              })
            ) : (
              <div className="helper-text helper-text-small">
                {hasReceivedInput ? 'No context messages available' : 'Connect an input node to see context here'}
              </div>
            )}
          </div>
        </details>

        {/* Aspect Ratio Selector */}
        <div className="parameter-control" style={{ borderBottom: 'none', minHeight: 'auto' }}>
          <span className="control-label">Aspect Ratio</span>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="nodrag"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--node-border-color)',
              background: 'var(--node-body-background)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <option value="9:16">9:16 (Portrait)</option>
            <option value="1:1">1:1 (Square)</option>
            <option value="4:5">4:5</option>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="3:2">3:2</option>
            <option value="2:3">2:3</option>
            <option value="5:4">5:4</option>
          </select>
        </div>

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
    </BaseNode>
  );
};

export default ImagePromptNode;
