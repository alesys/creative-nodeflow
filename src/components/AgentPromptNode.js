// Agent Prompt Node - Continuation prompt with context input
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomNodeBase from './CustomNodeBase';
import OpenAIService from '../services/OpenAIService';

const AgentPromptNode = ({ data, id, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [inputContext, setInputContext] = useState(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);
  const textareaRef = useRef(null);

  const systemPrompt = data.systemPrompt || 
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT || 
    'You are a helpful AI assistant.';

  // Listen for incoming context from connected nodes
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
        setError('Please enter a prompt first');
        return;
      }

      // Trigger main function - send to OpenAI with context
      try {
        setIsProcessing(true);
        
        if (!OpenAIService.isConfigured()) {
          throw new Error('OpenAI API key not configured. Please check your .env file.');
        }

        // Pass the received context to OpenAI for continuity
        const response = await OpenAIService.generateResponse(
          prompt, 
          systemPrompt, 
          inputContext
        );
        
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
        console.error('Error processing agent prompt:', err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [prompt, systemPrompt, id, data, inputContext]);

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
    if (!hasReceivedInput) {
      return {
        icon: '⚠️',
        text: 'Waiting for input context',
        color: '#d97706'
      };
    }
    return {
      icon: '✅',
      text: 'Context received',
      color: '#059669'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <CustomNodeBase 
      hasInput={true}
      hasOutput={true}
      nodeType="agent"
      className={`${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}
    >
      <div className="node-header">
        <span>🤖 Agent Prompt</span>
        <span className="helper-text helper-text-small">
          {connectionStatus.icon} {connectionStatus.text}
        </span>
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your follow-up prompt here... Press Ctrl+Enter to execute"

          />
          <div className="helper-text helper-text-margined">
            Press Ctrl+Enter to execute • Click outside to preview
          </div>
        </div>
      ) : (
        <div 
          onClick={handleEditClick}
          className="preview-content"
        >
          {prompt ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prompt}
            </ReactMarkdown>
          ) : (
            <span className="helper-text helper-text-italic">
              Click to add follow-up prompt...
            </span>
          )}
        </div>
      )}

      {inputContext && (
        <details className="details-section">
          <summary className="helper-text summary-clickable">
            Input Context ({inputContext.messages?.length || 0} messages)
          </summary>
          <div className="context-details">
            {inputContext.messages?.slice(-2).map((msg, idx) => (
              <div key={idx} className="output-item">
                <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                {msg.content.length > 80 && '...'}
              </div>
            ))}
          </div>
        </details>
      )}

      {isProcessing && (
        <div className="status-indicator processing">
          <span>🔄</span> Processing with context...
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

export default AgentPromptNode;