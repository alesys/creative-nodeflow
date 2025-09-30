// Starting Prompt Node - Entry point for prompt chains
import React, { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomNodeBase from './CustomNodeBase';
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
    <CustomNodeBase 
      hasOutput={true}
      hasInput={false}
      nodeType="starting"
      className={`${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}
    >
      <div className="node-header">
        🚀 Starting Prompt
      </div>

      {isEditing ? (
        <div style={{ padding: '4px' }}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            className="nodrag"
            placeholder="Enter your prompt here... Press Ctrl+Enter to execute"
            style={{
              padding: '12px',
              margin: '4px 0',
              borderRadius: '6px'
            }}
          />
          <div className="helper-text" style={{ padding: '0 4px', marginTop: '8px' }}>
            Press Ctrl+Enter to execute • Click outside to preview
          </div>
        </div>
      ) : (
        <div 
          onClick={handleEditClick}
          className="preview-content"
          style={{
            padding: '16px',
            margin: '4px',
            minHeight: '80px'
          }}
        >
          {prompt ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prompt}
            </ReactMarkdown>
          ) : (
            <span className="helper-text" style={{ fontStyle: 'italic' }}>
              Click to add prompt...
            </span>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="status-indicator processing" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🔄</span> Processing with OpenAI...
        </div>
      )}

      {error && (
        <div className="status-indicator error">
          ⚠️ {error}
        </div>
      )}
    </CustomNodeBase>
  );
};

export default StartingPromptNode;