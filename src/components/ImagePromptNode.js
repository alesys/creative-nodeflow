// Image Prompt Node - Uses Google Gemini for image generation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position } from '@xyflow/react';
import GoogleAIService from '../services/GoogleAIService';

const ImagePromptNode = ({ data, id, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [inputContext, setInputContext] = useState(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);
  const textareaRef = useRef(null);

  // Listen for incoming context from connected nodes (optional for image generation)
  useEffect(() => {
    if (data.onReceiveInput) {
      data.onReceiveInput((inputData) => {
        setInputContext(inputData.context);
        setHasReceivedInput(true);
        setError(null);
      });
    }
  }, [data]);

  const handleKeyDown = useCallback(async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Switch from editing to render mode
      setIsEditing(false);
      setError(null);
      
      if (!prompt.trim()) {
        setError('Please enter an image prompt first');
        return;
      }

      // Trigger main function - send to Google Gemini (Nano Banana)
      try {
        setIsProcessing(true);
        
        if (!GoogleAIService.isConfigured()) {
          throw new Error('Google API key not configured. Please check your .env file.');
        }

        // Generate image using Nano Banana with optional context
        const response = await GoogleAIService.generateImage(prompt, inputContext);
        
        // Emit the response through the output
        if (data.onOutput) {
          data.onOutput({
            nodeId: id,
            content: response.content,
            context: response.context,
            type: 'image'
          });
        }
        
      } catch (err) {
        console.error('Error generating image:', err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [prompt, id, data, inputContext]);

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    // Focus the textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

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