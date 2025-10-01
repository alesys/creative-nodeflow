// Starting Prompt Node - Entry point for prompt chains
import React, { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position } from '@xyflow/react';
import OpenAIService from '../services/OpenAIService';

const StartingPromptNode = ({ data, id, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const systemPrompt = data.systemPrompt || 
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT || 
    'You are a helpful AI assistant.';

  const handleKeyDown = useCallback(async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Switch from editing to render mode
      setIsEditing(false);
      setError(null);
      
      if (!prompt.trim()) {
        setError('Please enter a prompt first');
        return;
      }

      // Trigger main function - send to OpenAI
      try {
        setIsProcessing(true);
        
        if (!OpenAIService.isConfigured()) {
          throw new Error('OpenAI API key not configured. Please check your .env file.');
        }

        const response = await OpenAIService.generateResponse(prompt, systemPrompt);
        
        // Emit the response through the output
        if (data.onOutput) {
          data.onOutput({
            nodeId: id,
            content: response.content,
            context: response.context,
            type: 'text'
          });
        }
        
      } catch (err) {
        console.error('Error processing prompt:', err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [prompt, systemPrompt, id, data]);

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

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
      {/* Node Header with Design System Gradient */}
      <div className="node-header text-positive">
        Starting Prompt
      </div>

      {/* Node Body */}
      <div className="node-body">
        
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
              className="nodrag textarea-control positive"
              placeholder="Enter your prompt here... Press Ctrl+Enter to execute"
            />
            <div className="helper-text helper-text-margined">
              Press Ctrl+Enter to execute • Click outside to preview
            </div>
          </div>
        ) : (
          <div 
            onClick={handleEditClick}
            className="textarea-control positive"
            style={{ cursor: 'pointer', minHeight: 'var(--textarea-min-height)' }}
          >
            {prompt ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt}
              </ReactMarkdown>
            ) : (
              <span className="helper-text helper-text-italic">
                Click to add prompt...
              </span>
            )}
          </div>
        )}

        {/* Status Indicators */}
        {isProcessing && (
          <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
            <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
              🔄 Processing with OpenAI...
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

      {/* ReactFlow Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle"
      />
    </div>
  );
};

export default StartingPromptNode;